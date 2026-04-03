<?php

declare(strict_types=1);

namespace Praetorius\VscodeFluidLanguage;

use TYPO3Fluid\Fluid\Schema\ViewHelperMetadata;

/**
 * Generates customData to enable basic tag auto-completion in
 * VSCode-based editors.
 *
 * @internal
 */
final class HtmlCustomDataGenerator
{
    /**
     * @param ViewHelperMetadata[] $viewHelpers
     */
    public function generate(string $alias, array $viewHelpers): array
    {
        $customData = [
            'schema' => 'https://raw.githubusercontent.com/microsoft/vscode-html-languageservice/refs/heads/main/docs/customData.schema.json',
            'version' => 1.1,
            'tags' => [],
            'globalAttributes' => [],
            'valueSets' => [
                [
                    'name' => 'boolean',
                    'values' => [
                        [
                            'name' => '{true}'
                        ],
                        [
                            'name' => '{false}'
                        ]
                    ],
                ],
            ],
        ];
        foreach ($viewHelpers as $metadata) {
            $tag = [
                'name' => $alias . ':' . $metadata->tagName,
                'attributes' => [],
            ];

            $documentation = $metadata->documentation;
            // Add deprecation information to ViewHelper documentation
            if (isset($metadata->docTags['@deprecated'])) {
                $documentation .= "\n\n**@deprecated " . implode(' ', $metadata->docTags['@deprecated']) . '**';
            }
            // If @see is a link, it can be added as proper reference
            if (isset($metadata->docTags['@see'])) {
                foreach ($metadata->docTags['@see'] as $see) {
                    if (str_starts_with($see, 'https://')) {
                        $tag['references'] ??= [];
                        $tag['references'][] = [
                            'name' => $see,
                            'url' => $see
                        ];
                    } else {
                        $documentation .= "\n@see " . $see;
                    }
                }
            }
            $documentation = trim($documentation);
            // Add documentation to JSON
            if ($documentation !== '') {
                $tag['description'] = [
                    'kind' => 'markdown',
                    'value' => $documentation,
                ];
            }

            // Add argument definitions to JSON
            foreach ($metadata->argumentDefinitions as $argumentDefinition) {
                $attribute = [
                    'name' => $argumentDefinition->getName(),
                    'description' => [
                        'kind' => 'markdown',
                        'value' => implode("\n", [
                            '|             |                 |',
                            '|-------------|-----------------|',
                            '| **Description** | ' . $argumentDefinition->getDescription() . ' |',
                            '| **Type**        | ' . $argumentDefinition->getType() . ' |',
                            '| **Required**    | ' . ($argumentDefinition->isRequired() ? 'yes' : 'no') . ' |',
                        ])
                    ]
                ];

                if ($argumentDefinition->isBooleanType()) {
                    $attribute['valueSet'] = 'boolean';
                }

                $tag['attributes'][] = $attribute;
            }
            $customData['tags'][] = $tag;
        }

        return $customData;
    }
}
