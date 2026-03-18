<?php

namespace modules;

use Aws\S3\S3Client;
use Craft;
use craft\behaviors\EnvAttributeParserBehavior;
use craft\flysystem\base\FlysystemFs;
use craft\helpers\App;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\AwsS3V3\PortableVisibilityConverter;
use League\Flysystem\FilesystemAdapter;

class R2Fs extends FlysystemFs
{
    public bool $hasUrls = true;
    public string $bucket = '';
    public string $keyId = '';
    public string $secret = '';
    public string $region = 'auto';
    public string $endpoint = '';
    public string $subfolder = '';
    public bool $usePathStyleEndpoint = true;

    public static function displayName(): string
    {
        return 'Cloudflare R2';
    }

    public function getSettingsHtml(): ?string
    {
        return Craft::$app->getView()->renderTemplate('r2-fs/_components/fs/R2Fs/settings.twig', [
            'volume' => $this,
            'readOnly' => false,
        ]);
    }

    public function getReadOnlySettingsHtml(): ?string
    {
        return Craft::$app->getView()->renderTemplate('r2-fs/_components/fs/R2Fs/settings.twig', [
            'volume' => $this,
            'readOnly' => true,
        ]);
    }

    public function attributeLabels(): array
    {
        return array_merge(parent::attributeLabels(), [
            'bucket' => 'Bucket',
            'keyId' => 'Access Key ID',
            'secret' => 'Secret Access Key',
            'region' => 'Region',
            'endpoint' => 'Endpoint',
            'subfolder' => 'Subfolder',
            'usePathStyleEndpoint' => 'Use path-style endpoint',
        ]);
    }

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['parser'] = [
            'class' => EnvAttributeParserBehavior::class,
            'attributes' => [
                'bucket',
                'keyId',
                'secret',
                'region',
                'endpoint',
                'subfolder',
            ],
        ];

        return $behaviors;
    }

    protected function defineRules(): array
    {
        return array_merge(parent::defineRules(), [
            [['bucket', 'keyId', 'secret', 'endpoint'], 'required'],
        ]);
    }

    public function getRootUrl(): ?string
    {
        $rootUrl = parent::getRootUrl();
        $subfolder = $this->normalizedSubfolder();

        if ($rootUrl && $subfolder !== '') {
            return rtrim($rootUrl, '/') . '/' . $subfolder;
        }

        return $rootUrl;
    }

    protected function createAdapter(): FilesystemAdapter
    {
        $client = new S3Client([
            'version' => 'latest',
            'region' => App::parseEnv($this->region),
            'endpoint' => App::parseEnv($this->endpoint),
            'use_path_style_endpoint' => $this->usePathStyleEndpoint,
            'credentials' => [
                'key' => App::parseEnv($this->keyId),
                'secret' => App::parseEnv($this->secret),
            ],
        ]);

        return new AwsS3V3Adapter(
            $client,
            App::parseEnv($this->bucket),
            $this->normalizedSubfolder(),
            new PortableVisibilityConverter($this->visibility())
        );
    }

    protected function invalidateCdnPath(string $path): bool
    {
        return true;
    }

    private function normalizedSubfolder(): string
    {
        $subfolder = trim(App::parseEnv($this->subfolder), '/');

        return $subfolder !== '' ? $subfolder . '/' : '';
    }
}
