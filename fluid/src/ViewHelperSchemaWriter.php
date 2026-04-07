<?php

declare(strict_types=1);

namespace Praetorius\VscodeFluidLanguage;

use Composer\Script\Event;
use Praetorius\VscodeFluidLanguage\HtmlCustomDataGenerator;
use TYPO3Fluid\Fluid\Schema\ViewHelperFinder;

final class ViewHelperSchemaWriter
{
    public static function discoverAndWrite(Event $event): void
    {
        $vendorDir = $event->getComposer()->getConfig()->get('vendor-dir');
        $autoloader = require $vendorDir . '/autoload.php';
        $allViewHelpers = (new ViewHelperFinder())->findViewHelpersInComposerProject($autoloader, true);

        $groupedByNamespace = [];
        foreach ($allViewHelpers as $viewHelper) {
            $groupedByNamespace[$viewHelper->xmlNamespace] ??= [];
            $groupedByNamespace[$viewHelper->xmlNamespace][$viewHelper->tagName] = $viewHelper;
        }

        if (!isset($groupedByNamespace['http://typo3.org/ns/TYPO3Fluid/Fluid/ViewHelpers'])) {
            throw new \RuntimeException('Unable to find definitions for typo3fluid/fluid ViewHelpers');
        }
        if (!isset($groupedByNamespace['http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers'])) {
            throw new \RuntimeException('Unable to find definitions for typo3/cms-fluid ViewHelpers');
        }
        if (!isset($groupedByNamespace['http://typo3.org/ns/TYPO3/CMS/Form/ViewHelpers'])) {
            throw new \RuntimeException('Unable to find definitions for typo3/cms-form ViewHelpers');
        }
        if (!isset($groupedByNamespace['http://typo3.org/ns/TYPO3/CMS/Core/ViewHelpers'])) {
            throw new \RuntimeException('Unable to find definitions for typo3/cms-core ViewHelpers');
        }

        // Generate customData for Fluid Standalone
        // $customData = (new HtmlCustomDataGenerator())->generate('f', $groupedByNamespace['http://typo3.org/ns/TYPO3Fluid/Fluid/ViewHelpers']);
        // file_put_contents(__DIR__ . '/../out/schema_TYPO3Fluid_Fluid_ViewHelpers.json', json_encode($customData));

        // Generate customData for TYPO3's EXT:fluid
        $customData = (new HtmlCustomDataGenerator())->generate('f', array_replace(
            $groupedByNamespace['http://typo3.org/ns/TYPO3Fluid/Fluid/ViewHelpers'],
            $groupedByNamespace['http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers'],
        ));
        file_put_contents(__DIR__ . '/../out/schema_TYPO3_CMS_Fluid_ViewHelpers.json', json_encode($customData));

        // Generate customData for TYPO3's EXT:form
        $customData = (new HtmlCustomDataGenerator())->generate('formvh', $groupedByNamespace['http://typo3.org/ns/TYPO3/CMS/Form/ViewHelpers']);
        file_put_contents(__DIR__ . '/../out/schema_TYPO3_CMS_Form_ViewHelpers.json', json_encode($customData));

        // Generate customData for TYPO3's EXT:core
        $customData = (new HtmlCustomDataGenerator())->generate('core', $groupedByNamespace['http://typo3.org/ns/TYPO3/CMS/Core/ViewHelpers']);
        file_put_contents(__DIR__ . '/../out/schema_TYPO3_CMS_Core_ViewHelpers.json', json_encode($customData));
    }
}
