<?php

namespace modules;

use Craft;
use craft\elements\Asset;
use craft\elements\Entry;
use craft\services\Elements;
use craft\events\ElementEvent;
use yii\base\Event;
use yii\base\Module;

class ShapefileConverter extends Module
{
    public function init()
    {
        parent::init();

        // Listen for asset save event
        Event::on(
            Elements::class,
            Elements::EVENT_AFTER_SAVE_ELEMENT,
            function (ElementEvent $event) {
                $element = $event->element;

                // Process only .shp assets
                if ($element instanceof Asset && $this->isShapefile($element)) {
                    $this->processShapefile($element);
                }
            }
        );
    }

    /**
     * Check if the uploaded file is a shapefile.
     */
    private function isShapefile(Asset $asset): bool
    {
        return strtolower($asset->getExtension()) === 'shp';
    }

    /**
     * Process the uploaded shapefile and convert it to GeoJSON.
     */
    private function processShapefile(Asset $shapefileAsset)
    {
        try {
            $shapefilePath = $this->getAssetPath($shapefileAsset);
            $geoJsonDirectory = Craft::getAlias('@webroot') . '/uploads/geojson';
            $geoJsonPath = $geoJsonDirectory . '/' . pathinfo($shapefileAsset->filename, PATHINFO_FILENAME) . '.geojson';

            Craft::info("Shapefile path: $shapefilePath", __METHOD__);
            Craft::info("GeoJSON directory: $geoJsonDirectory", __METHOD__);

            // Ensure the GeoJSON directory exists
            if (!is_dir($geoJsonDirectory) && !mkdir($geoJsonDirectory, 0777, true)) {
                throw new \Exception("Failed to create GeoJSON directory: $geoJsonDirectory");
            }

            // Check for companion files
            $requiredExtensions = ['shx', 'dbf'];
            foreach ($requiredExtensions as $ext) {
                $companionFile = dirname($shapefilePath) . '/' . pathinfo($shapefilePath, PATHINFO_FILENAME) . '.' . $ext;
                if (!file_exists($companionFile)) {
                    throw new \Exception("Missing required companion file: $companionFile");
                }
            }

            // Escape paths and run ogr2ogr
            $escapedShapefilePath = escapeshellarg($shapefilePath);
            $escapedGeoJsonPath = escapeshellarg($geoJsonPath);
            $command = "ogr2ogr -f GeoJSON -t_srs EPSG:4326 $escapedGeoJsonPath $escapedShapefilePath";

            Craft::info("Executing command: $command", __METHOD__);
            exec($command . ' 2>&1', $output, $resultCode);

            if ($resultCode !== 0) {
                throw new \Exception("ogr2ogr failed. Command: $command Output: " . implode("\n", $output));
            }

            Craft::info("GeoJSON generated successfully: $geoJsonPath", __METHOD__);
            $this->saveGeoJsonToEntry($shapefileAsset, $geoJsonPath);
        } catch (\Exception $e) {
            Craft::error("Error processing shapefile: " . $e->getMessage(), __METHOD__);
        }
    }

    /**
     * Resolve the asset's path on the filesystem.
     */
    private function getAssetPath(Asset $asset): string
    {
        $volume = $asset->getVolume();
        $fs = $volume->getFs();

        // Ensure the file system is a local file system
        if ($fs->getRootPath() === null) {
            throw new \Exception("The file system for volume {$volume->handle} is not a local file system.");
        }

        return $fs->getRootPath() . '/' . $asset->getPath();
    }

    /**
     * Associate the generated GeoJSON with the entry.
     */
    private function saveGeoJsonToEntry(Asset $shapefileAsset, string $geoJsonPath)
    {
        $entry = Entry::find()
            ->section('realEstate')
            ->relatedTo($shapefileAsset)
            ->one();

        if (!$entry) {
            Craft::warning("No related entry found for shapefile asset: " . $shapefileAsset->title, __METHOD__);
            return;
        }

        $entry->setFieldValue('geoJson', $geoJsonPath);
        if (!Craft::$app->getElements()->saveElement($entry)) {
            Craft::error("Failed to update entry with GeoJSON path: $geoJsonPath", __METHOD__);
        } else {
            Craft::info("GeoJSON path saved to entry: " . $entry->title, __METHOD__);
        }
    }
}