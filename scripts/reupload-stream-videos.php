<?php

declare(strict_types=1);

use Craft;
use craft\elements\Asset;
use deuxhuithuit\cfstream\fields\CloudflareVideoStreamField;
use deuxhuithuit\cfstream\Folder;
use deuxhuithuit\cfstream\jobs\UploadVideoJob;

require dirname(__DIR__) . '/bootstrap.php';
require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';

$assets = Asset::find()
    ->volume('videos')
    ->kind(Asset::KIND_VIDEO)
    ->status(null)
    ->all();

$queued = 0;

foreach ($assets as $asset) {
    $field = CloudflareVideoStreamField::findStreamingFieldForAsset($asset);
    if (!$field) {
        continue;
    }

    Craft::$app->getQueue()->push(new UploadVideoJob([
        'fieldHandle' => $field->handle,
        'elementId' => $asset->id,
        'videoUrl' => $asset->getUrl(),
        'videoName' => $asset->filename,
        'videoPath' => Folder::getAssetFolderPath($asset),
        'videoTitle' => $asset->title,
    ]));

    $queued++;
}

fwrite(STDOUT, "Queued {$queued} video upload job(s).\n");
