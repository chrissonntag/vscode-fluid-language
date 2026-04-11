export interface TemplateValidatorResult {
    identifier: string,
    path: string,
    errors: TemplateValidatorResultError[],
    deprecations: TemplateValidatorResultDeprecation[],
}

interface TemplateValidatorResultError {
    file: string,
    line: number,
    message: string,
    templateLocation?: {
        identifierOrPath: string,
        line: number,
        character: number,
    },
}

interface TemplateValidatorResultDeprecation {
    file: string,
    line: number,
    message: string
}

export interface BinaryCommand {
    command: string,
    args: string[],
    userDefined?: boolean
}

export interface ExtensionConfiguration {
    bin: {
        typo3: string,
        fluid: string,
        useDdevIfAvailable: boolean,
    },
    features: {
        liveTemplateAnalysis: boolean,
    },
}
