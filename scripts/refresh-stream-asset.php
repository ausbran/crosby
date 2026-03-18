<?php

declare(strict_types=1);

use Craft;
use craft\elements\Asset;

require dirname(__DIR__) . '/bootstrap.php';
require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';

$assetId = isset($argv[1]) ? (int)$argv[1] : 0;
$videoUid = $argv[2] ?? null;

if (!$assetId || !$videoUid) {
    fwrite(STDERR, "Usage: php scripts/refresh-stream-asset.php <assetId> <videoUid>\n");
    exit(1);
}

$asset = Asset::find()->id($assetId)->site('default')->one();
if (!$asset) {
    fwrite(STDERR, "Asset {$assetId} not found.\n");
    exit(1);
}

$accountId = getenv('CLOUDFLARE_ACCOUNT_ID');
$apiToken = getenv('CLOUDFLARE_STREAM_API_TOKEN');
if (!$accountId || !$apiToken) {
    fwrite(STDERR, "Missing Cloudflare Stream credentials in env.\n");
    exit(1);
}

$url = sprintf(
    'https://api.cloudflare.com/client/v4/accounts/%s/stream/%s',
    $accountId,
    $videoUid
);

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "Authorization: Bearer {$apiToken}\r\n",
    ],
]);

$json = file_get_contents($url, false, $context);
if ($json === false) {
    fwrite(STDERR, "Failed to fetch Cloudflare Stream status.\n");
    exit(1);
}

$response = json_decode($json, true);
if (empty($response['success']) || empty($response['result'])) {
    fwrite(STDERR, "Cloudflare Stream did not return a valid result.\n");
    exit(1);
}

$asset->setFieldValue('videoStream', $response['result']);
if (!Craft::$app->getElements()->saveElement($asset, false, true, false)) {
    fwrite(STDERR, "Failed to save asset {$assetId}.\n");
    exit(1);
}

fwrite(STDOUT, "Updated asset {$assetId} from Cloudflare Stream.\n");
