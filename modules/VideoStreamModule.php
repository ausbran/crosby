<?php

namespace modules;

use Craft;
use craft\base\Element;
use craft\elements\Asset;
use craft\events\ElementEvent;
use craft\events\ModelEvent;
use craft\events\RegisterComponentTypesEvent;
use craft\events\RegisterTemplateRootsEvent;
use craft\services\Elements;
use craft\services\Fs;
use craft\services\Plugins;
use craft\web\Response;
use craft\web\View;
use deuxhuithuit\cfstream\client\CloudflareVideoStreamClient;
use deuxhuithuit\cfstream\fields\CloudflareVideoStreamField;
use deuxhuithuit\cfstream\jobs\PollVideoJob;
use deuxhuithuit\cfstream\jobs\TusUploadVideoJob;
use deuxhuithuit\cfstream\jobs\UploadVideoJob;
use deuxhuithuit\cfstream\Plugin as CloudflareStreamPlugin;
use yii\base\Event;
use yii\base\Module;
use yii\db\Query;
use yii\queue\PushEvent;
use yii\queue\Queue as YiiQueue;

class VideoStreamModule extends Module
{
    private static bool $streamQueueBurstScheduled = false;
    private const STREAM_QUEUE_RUNNER_TTL = 90;

    public function init()
    {
        parent::init();

        Craft::info('VideoStreamModule loaded', __METHOD__);

        Event::on(
            View::class,
            View::EVENT_REGISTER_CP_TEMPLATE_ROOTS,
            function (RegisterTemplateRootsEvent $event) {
                $baseDir = __DIR__ . '/templates';
                if (is_dir($baseDir)) {
                    $event->roots['r2-fs'] = $baseDir;
                }
            }
        );

        Event::on(
            Fs::class,
            Fs::EVENT_REGISTER_FILESYSTEM_TYPES,
            function (RegisterComponentTypesEvent $event) {
                $event->types[] = R2Fs::class;
            }
        );

        Event::on(
            Plugins::class,
            Plugins::EVENT_AFTER_LOAD_PLUGINS,
            function () {
                if (!Craft::$app->getPlugins()->isPluginEnabled('cloudflare-stream')) {
                    return;
                }

                if (!class_exists(CloudflareVideoStreamField::class)) {
                    return;
                }

                Event::on(
                    Asset::class,
                    Element::EVENT_BEFORE_SAVE,
                    function (ModelEvent $event) {
                        if (!$event->isNew || $event->isValid) {
                            return;
                        }

                        $asset = $event->sender;
                        if (!$asset instanceof Asset) {
                            return;
                        }

                        if ($asset->kind === Asset::KIND_VIDEO) {
                            return;
                        }

                        $streamField = CloudflareVideoStreamField::findStreamingFieldForAsset($asset);
                        if (!$streamField) {
                            return;
                        }

                        $event->isValid = true;
                    }
                );

                Event::on(
                    YiiQueue::class,
                    YiiQueue::EVENT_AFTER_PUSH,
                    function (PushEvent $event) {
                        if (!$this->isStreamQueueJob($event->job)) {
                            return;
                        }

                        if (Craft::$app->getRequest()->getIsConsoleRequest()) {
                            return;
                        }

                        if (self::$streamQueueBurstScheduled) {
                            return;
                        }

                        self::$streamQueueBurstScheduled = true;
                        Craft::$app->getResponse()->on(Response::EVENT_AFTER_SEND, function () {
                            $this->runStreamQueueBurst();
                        });
                    }
                );

                Event::on(
                    Elements::class,
                    Elements::EVENT_AFTER_SAVE_ELEMENT,
                    function (ElementEvent $event) {
                        $element = $event->element;
                        if (!$element instanceof Asset || $element->kind !== Asset::KIND_VIDEO) {
                            return;
                        }

                        $streamField = CloudflareVideoStreamField::findStreamingFieldForAsset($element);
                        if (!$streamField) {
                            return;
                        }

                        $streamValue = $element->getFieldValue($streamField->handle);
                        if (!is_array($streamValue)) {
                            return;
                        }

                        if (empty($streamValue['completed'])) {
                            return;
                        }

                        $thumbnailPct = $streamValue['thumbnailTimestampPct'] ?? null;
                        if ($thumbnailPct !== null && $thumbnailPct !== '' && (float)$thumbnailPct > 0) {
                            return;
                        }

                        $duration = $streamValue['duration'] ?? null;
                        $videoUid = $streamValue['uid'] ?? null;
                        if (!$videoUid || !is_numeric($duration) || (float)$duration <= 0) {
                            return;
                        }

                        try {
                            $client = new CloudflareVideoStreamClient(CloudflareStreamPlugin::getInstance()->getSettings());
                            $targetPct = 0.5;
                            $response = $client->updateThumbnail($videoUid, (float)$duration * $targetPct, (float)$duration);
                            if (!empty($response['error'])) {
                                Craft::warning('Stream thumbnail update failed: ' . $response['message'], __METHOD__);
                                return;
                            }

                            $streamValue['thumbnailTimestampPct'] = $targetPct;
                            $element->setFieldValue($streamField->handle, $streamValue);
                            Craft::$app->getElements()->saveElement($element, false, true, false);
                        } catch (\Throwable $e) {
                            Craft::warning('Stream thumbnail update error: ' . $e->getMessage(), __METHOD__);
                        }
                    }
                );
            }
        );
    }

    private function isStreamQueueJob(mixed $job): bool
    {
        return $job instanceof UploadVideoJob
            || $job instanceof PollVideoJob
            || $job instanceof TusUploadVideoJob;
    }

    private function runStreamQueueBurst(): void
    {
        $request = Craft::$app->getRequest();
        if ($request->getIsConsoleRequest()) {
            return;
        }

        if ($request->getPathInfo() === 'actions/queue/run') {
            return;
        }

        if (!$this->hasPendingStreamJobs()) {
            return;
        }

        $this->spawnStreamQueueRunner();
    }

    private function spawnStreamQueueRunner(): void
    {
        if (!function_exists('exec')) {
            Craft::warning('exec() is disabled; cannot spawn queue runner.', __METHOD__);
            return;
        }

        $runtimePath = Craft::getAlias('@storage/runtime');
        if (!is_dir($runtimePath)) {
            @mkdir($runtimePath, 0775, true);
        }

        $stampFile = $runtimePath . '/stream-queue-runner.timestamp';
        $now = time();

        if (is_file($stampFile) && ($now - filemtime($stampFile)) < self::STREAM_QUEUE_RUNNER_TTL) {
            return;
        }

        @touch($stampFile);

        try {
            $rootPath = Craft::getAlias('@root');
        } catch (\Throwable $e) {
            $rootPath = Craft::$app->getBasePath();
        }

        $loops = 30;
        $sleepSeconds = 3;
        $command = sprintf(
            'cd %s && nohup sh -c \'for i in $(seq 1 %d); do php craft queue/run >/dev/null 2>&1; sleep %d; done\' >/dev/null 2>&1 &',
            escapeshellarg($rootPath),
            $loops,
            $sleepSeconds
        );

        @exec($command);
    }

    private function hasPendingStreamJobs(): bool
    {
        $queueTable = Craft::$app->getQueue()->tableName;

        return (new Query())
            ->from($queueTable)
            ->where(['like', 'description', 'Uploading video to Cloudflare Stream%', false])
            ->orWhere(['like', 'description', 'Polling video%', false])
            ->orWhere(['like', 'description', 'TUS upload video%', false])
            ->exists();
    }
}
