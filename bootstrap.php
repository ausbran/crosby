<?php
/**
 * Shared bootstrap file
 */

// Define path constants
define('CRAFT_BASE_PATH', __DIR__);
define('CRAFT_VENDOR_PATH', CRAFT_BASE_PATH . '/vendor');

// Load Composer's autoloader
require_once CRAFT_VENDOR_PATH . '/autoload.php';

// Custom modules live at the project root and need a Yii alias for console routing.
\yii\BaseYii::setAlias('@modules', CRAFT_BASE_PATH . '/modules');

// Load dotenv?
if (class_exists(Dotenv\Dotenv::class)) {
    // By default, this will allow .env file values to override environment variables
    // with matching names. Use `createUnsafeImmutable` to disable this.
    Dotenv\Dotenv::createUnsafeMutable(CRAFT_BASE_PATH)->safeLoad();
}
