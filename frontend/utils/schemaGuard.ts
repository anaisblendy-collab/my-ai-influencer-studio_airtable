// import { GlobalConfig, Base } from '@airtable/blocks/ui';
type Base = any;
type GlobalConfig = any;

const REQUIRED_KEYS = [
    'influencersTableId',
    'promptsTableId',
    'queueTableId',
    'contentTableId',
    'influencerNameFieldId',
    'influencerAgeFieldId',
    'influencerGenderFieldId',
    'influencerNicheFieldId',
    'influencerStyleFieldId',
    'queuePromptFieldId',
    'queueProviderFieldId',
    'queueModelFieldId',
    'queueStatusFieldId',
    'queueOutputFieldId',
    'queueErrorFieldId',
    'queueCostFieldId',
    'contentOutputFieldId',
    'contentInfluencerFieldId'
];


export function getSchemaIssues(base: Base, globalConfig: GlobalConfig): string[] {
    const issues: string[] = [];
    const influencersTableId = globalConfig.get('influencersTableId') as string | undefined;
    const promptsTableId = globalConfig.get('promptsTableId') as string | undefined;
    const queueTableId = globalConfig.get('queueTableId') as string | undefined;
    const contentTableId = globalConfig.get('contentTableId') as string | undefined;

    if (!influencersTableId || !base.getTableByIdIfExists(influencersTableId)) issues.push('Missing Influencers table');
    if (!promptsTableId || !base.getTableByIdIfExists(promptsTableId)) issues.push('Missing Prompts table');
    if (!queueTableId || !base.getTableByIdIfExists(queueTableId)) issues.push('Missing Production Queue table');
    if (!contentTableId || !base.getTableByIdIfExists(contentTableId)) issues.push('Missing Content table');

    REQUIRED_KEYS.forEach((key) => {
        if (!globalConfig.get(key)) issues.push(`Missing field config: ${key}`);
    });
    return issues;
}
