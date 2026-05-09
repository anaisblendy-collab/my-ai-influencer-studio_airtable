/**
 * Airtable Service - Write back to Airtable (following official guide)
 * https://airtable.com/developers/extensions/guides/write-back-to-airtable
 */

import { Table } from '@airtable/blocks/models';

export interface GenerationRecord {
    id: string;
    prompt: string;
    model: string;
    type: 'image' | 'video';
    status: 'pending' | 'completed' | 'failed';
    resultUrl?: string;
    createdAt: Date;
    cost?: number;
}

export interface InfluencerProfileRecord {
    id: string;
    name: string;
    age: string;
    gender: string;
    origin: string;
    niche: string;
    style: string;
    avatarUrl?: string;
    avatar?: any[];
    status?: string;
    approved?: boolean;
    fanvueAccountRecordIds?: string[];
    fanvueCreatorUuid?: string;
    // Expanded Agency Fields
    mainCharacterLora?: string; // JSON string or link to another record
    secondaryLoras?: string[]; // Array of strings
    totalGenerations: number;
    lastActive?: Date;
}

export interface AssetRecord {
    id: string;
    name: string;
    type?: string;
    provider?: string;
    sourceUrl?: string;
    trigger?: string;
    strength?: number;
    linkedInfluencerIds: string[];
    fileUrl?: string;
}

export interface ContentRecord {
    id: string;
    name: string;
    status?: string;
    prompt?: string;
    mediaUrl?: string;
    storageUrl?: string;
    cost?: string;
    duration?: string;
    type?: string;
    platform?: string;
    provider?: string;
    model?: string;
    createdAt?: string;
    approved?: boolean;
    influencerIds: string[];
}

export interface ContentMediaRecord {
    id: string;
    name: string;
    contentIds: string[];
    influencerIds: string[];
    mediaUrl?: string;
    storageUrl?: string;
    mediaType?: string;
    order?: number;
}

export interface JobRecord {
    id: string;
    influencerIds: string[];
    presetName?: string;
    status?: string;
    resultUrl?: string;
    cost?: number;
    createdAt?: Date;
    outputType?: string;
}

export interface FanvueAccountRecord {
    id: string;
    accountId?: string;
    username?: string;
    displayName?: string;
    status?: string;
    scopes?: string;
    influencerIds: string[];
    lastSyncAt?: string;
}

export interface FanvuePostRecord {
    id: string;
    fanvuePostId?: string;
    status?: string;
    postUrl?: string;
    caption?: string;
    mediaUrl?: string;
    mediaType?: string;
    publishedAt?: string;
    lastSyncAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    revenue?: number;
    influencerIds: string[];
    contentIds: string[];
    accountIds: string[];
}



export interface PresetRecord {
    id: string;
    name: string;
    goal?: string;
    platform?: string;
    promptTemplate?: string;
    defaultProvider?: string;
    defaultModel?: string;
    active?: string;
    defaults?: {
        provider?: string;
        model?: string;
        style?: string;
        platform?: string;
        promptTemplate?: string;
    };
}

export interface PromptRecord {
    id: string;
    prompt: string;
    influencerIds: string[];
    influencerName?: string;
    style?: string;
    platform?: string;
    status?: string;
    referenceImageUrl?: string;
}

export interface TableConfig {
    name: string;
    fields: {
        prompt: string;
        model: string;
        type: string;
        status: string;
        resultUrl: string;
        createdAt: string;
        cost: string;
    };
}

export class AirtableService {
    private base: any;
    private globalConfig?: any;
    private tableConfig: TableConfig = {
        name: 'Contenus',
        fields: {
            prompt: 'Prompt',
            model: 'Model',
            type: 'Type',
            status: 'Status',
            resultUrl: 'Result URL',
            createdAt: 'Created At',
            cost: 'Cost ($)'
        }
    };


    private influencerTableConfig = {
        name: 'Influencers',
        fields: {
            name: 'Name',
            age: 'Age',
            gender: 'Gender',
            niche: 'Niche',
            origin: 'Origin',
            style: 'Style',
            avatar: 'Avatar',
            status: 'Status',
            approved: 'Approved',
            fanvueAccount: 'Fanvue Account',
            fanvueCreatorUuid: 'Fanvue Creator UUID',
            mainCharacterLora: 'Main LoRA',
            secondaryLoras: 'Secondary LoRAs',
            totalGenerations: 'Total Generations',
            lastActive: 'Last Active'
        }
    };




    private modelsTableConfig = {
        name: 'Models',
        fields: {
            name: 'Name',
            id: 'Provider ID',
            type: 'Type',
            provider: 'Provider',
            group: 'Group',
            speed: 'Speed',
            price: 'Price',
            status: 'Status'
        }
    };

    private presetsTableConfig = {
        name: 'Presets',
        fields: {
            name: 'Name',
            goal: 'Goal',
            platform: 'Platform',
            promptTemplate: 'Prompt Template',
            defaultProvider: 'Default Provider',
            defaultModel: 'Default Model',
            active: 'Active'
        }
    };

    private assetsTableConfig = {
        name: 'Assets',
        fields: {
            name: 'Name',
            type: 'Type',
            provider: 'Provider',
            sourceUrl: 'SourceUrl',
            trigger: 'Trigger',
            strength: 'Strength',
            linkedInfluencer: 'LinkedInfluencer',
            file: 'File'
        }
    };

    private jobsTableConfig = {
        name: 'Jobs',
        fields: {
            influencer: 'Influencer',
            preset: 'Preset',
            status: 'Status',
            resultUrl: 'ResultUrl',
            cost: 'Cost',
            createdAt: 'CreatedAt',
            logs: 'Logs',
            outputType: 'OutputType'
        }
    };

    private promptsTableConfig = {
        name: 'Prompts',
        fields: {
            prompt: 'Prompt',
            influencer: 'Influencer',
            style: 'Style',
            platform: 'Platform',
            status: 'Status',
            referenceImage: 'Reference Image'
        }
    };


    private contentTableConfig = {
        name: 'Content',
        fields: {
            influencer: 'Influencer',
            name: 'Name',
            age: 'Age',
            niche: 'Niche',
            style: 'Style',
            status: 'Status',
            prompt: 'Prompt',
            model: 'Model',
            provider: 'Provider',
            type: 'Type',
            media: 'Output Media',
            platform: 'Platform',
            approved: 'Approved',
            createdAt: 'CreatedAt',
            storageUrl: 'Storage URL',
            source: 'Source',
            queueJob: 'Queue Job',
            promptSource: 'Prompt Source',
            publishTo: 'Publish To'
        }
    };

    private fanvueAccountsTableConfig = {
        name: 'Fanvue Accounts',
        fields: {
            name: 'Name',
            accountId: 'Fanvue Account ID',
            username: 'Username',
            displayName: 'Display Name',
            status: 'Status',
            scopes: 'Scopes',
            influencer: 'Influencer',
            lastSyncAt: 'Last Sync At'
        }
    };

    private fanvuePostsTableConfig = {
        name: 'Fanvue Posts',
        fields: {
            name: 'Name',
            fanvuePostId: 'Fanvue Post ID',
            status: 'Status',
            postUrl: 'Post URL',
            caption: 'Caption',
            mediaUrl: 'Media URL',
            mediaType: 'Media Type',
            publishedAt: 'Published At',
            lastSyncAt: 'Last Sync At',
            views: 'Views',
            likes: 'Likes',
            comments: 'Comments',
            revenue: 'Revenue',
            influencer: 'Influencer',
            content: 'Content',
            fanvueAccount: 'Fanvue Account'
        }
    };

    private contentMediaTableConfig = {
        name: 'Content Media',
        fields: {
            name: 'Name',
            content: 'Content',
            influencer: 'Influencer',
            mediaUrl: 'Media URL',
            storageUrl: 'Storage URL',
            mediaType: 'Media Type',
            order: 'Order'
        }
    };

    constructor(base: any, globalConfig?: any) {
        this.base = base;
        this.globalConfig = globalConfig;
    }

    /**
     * Get appropriate table by name
     */

    private setFieldIfExists(table: Table, fieldName: string, value: any, recordData: { [fieldName: string]: any }) {
        try {
            const field = (table as any).getFieldByIdIfExists?.(fieldName)
                || (table as any).getFieldByNameIfExists?.(fieldName)
                || table.getFieldByName(fieldName);
            let normalizedValue = value;
            if (field?.type === 'singleSelect') {
                if (typeof value === 'string') {
                    normalizedValue = this.buildSingleSelectValue(table, fieldName, value);
                } else if (value && typeof value === 'object' && typeof value.name === 'string' && !value.id) {
                    normalizedValue = this.buildSingleSelectValue(table, fieldName, value.name);
                }
            }
            recordData[fieldName] = normalizedValue;
        } catch {
            return;
        }
    }

    private getTable(name: string): Table | null {
        if (this.globalConfig) {
            let configKey = '';
            if (name === this.tableConfig.name || name === this.contentTableConfig.name) configKey = 'contentTableId';
            if (name === this.influencerTableConfig.name) configKey = 'influencersTableId';
            if (name === this.promptsTableConfig.name) configKey = 'promptsTableId';
            if (name === 'Production Queue' || name === 'Jobs') configKey = 'queueTableId';
            if (name === this.fanvueAccountsTableConfig.name) configKey = 'fanvueAccountsTableId';
            if (name === this.fanvuePostsTableConfig.name) configKey = 'fanvuePostsTableId';
            if (name === this.contentMediaTableConfig.name) configKey = 'contentMediaTableId';
            if (name === this.assetsTableConfig.name) configKey = 'assetsTableId';

            if (configKey) {
                const id = this.globalConfig.get(configKey) as string;
                if (id) {
                    const table = this.base.getTableByIdIfExists(id);
                    if (table) return table;
                }
            }
        }
        return this.base.getTableByNameIfExists(name);
    }

    private buildSingleSelectValue(table: Table, fieldName: string, value: string) {
        try {
            const field = (table as any).getFieldByIdIfExists?.(fieldName)
                || (table as any).getFieldByNameIfExists?.(fieldName)
                || table.getFieldByName(fieldName);
            const choices = (field as any)?.options?.choices || [];
            const match = choices.find((choice: any) =>
                String(choice.name).toLowerCase() === String(value).toLowerCase()
            );
            if (match) {
                return { id: match.id };
            }
        } catch {
            // Fall back to name object below.
        }
        return { name: value };
    }

    private getConfiguredTableId(key?: string): string | undefined {
        const id = key ? this.globalConfig?.get?.(key) : undefined;
        return typeof id === 'string' && id.trim() ? id.trim() : undefined;
    }

    private getConfiguredFieldId(key?: string): string | undefined {
        const id = key ? this.globalConfig?.get?.(key) : undefined;
        return typeof id === 'string' && id.trim() ? id.trim() : undefined;
    }

    private getTableByConfig(configKey: string | undefined, fallbackName: string): Table | null {
        if (configKey) {
            const tableId = this.getConfiguredTableId(configKey);
            if (tableId) {
                const table = this.base.getTableByIdIfExists(tableId);
                if (table) return table;
            }
        }
        return this.getTable(fallbackName);
    }

    private getFieldKey(configKey: string | undefined, fallbackName: string): string {
        return this.getConfiguredFieldId(configKey) || fallbackName;
    }

    private getCellValueIfExists(record: any, table: Table, fieldName: string) {
        try {
            const getById = (table as any).getFieldByIdIfExists?.(fieldName);
            const getByName = (table as any).getFieldByNameIfExists?.(fieldName);
            if (!getById && !getByName) {
                return undefined;
            }
            return record.getCellValue(fieldName);
        } catch {
            return undefined;
        }
    }

    private getCellValueAsStringIfExists(record: any, table: Table, fieldName: string): string {
        try {
            const getById = (table as any).getFieldByIdIfExists?.(fieldName);
            const getByName = (table as any).getFieldByNameIfExists?.(fieldName);
            if (!getById && !getByName) {
                return '';
            }
            return record.getCellValueAsString(fieldName) || '';
        } catch {
            return '';
        }
    }

    private getInfluencerFields() {
        return {
            name: this.getFieldKey('influencerNameFieldId', this.influencerTableConfig.fields.name),
            age: this.getFieldKey('influencerAgeFieldId', this.influencerTableConfig.fields.age),
            gender: this.getFieldKey('influencerGenderFieldId', this.influencerTableConfig.fields.gender),
            origin: this.getFieldKey('influencerOriginFieldId', this.influencerTableConfig.fields.origin),
            niche: this.getFieldKey('influencerNicheFieldId', this.influencerTableConfig.fields.niche),
            style: this.getFieldKey('influencerStyleFieldId', this.influencerTableConfig.fields.style),
            avatar: this.getFieldKey('influencerAvatarFieldId', this.influencerTableConfig.fields.avatar),
            status: this.getFieldKey('influencerStatusFieldId', this.influencerTableConfig.fields.status),
            approved: this.getFieldKey('influencerApprovedFieldId', this.influencerTableConfig.fields.approved),
            fanvueAccount: this.influencerTableConfig.fields.fanvueAccount,
            fanvueCreatorUuid: this.influencerTableConfig.fields.fanvueCreatorUuid,
            mainCharacterLora: this.influencerTableConfig.fields.mainCharacterLora,
            secondaryLoras: this.influencerTableConfig.fields.secondaryLoras,
            totalGenerations: this.influencerTableConfig.fields.totalGenerations,
            lastActive: this.influencerTableConfig.fields.lastActive,
        };
    }

    private getContentFields() {
        return {
            influencer: this.getFieldKey('contentInfluencerFieldId', this.contentTableConfig.fields.influencer),
            name: this.contentTableConfig.fields.name,
            status: this.contentTableConfig.fields.status,
            prompt: this.contentTableConfig.fields.prompt,
            model: this.contentTableConfig.fields.model,
            provider: this.contentTableConfig.fields.provider,
            type: this.contentTableConfig.fields.type,
            media: this.getFieldKey('contentOutputFieldId', this.contentTableConfig.fields.media),
            platform: this.getFieldKey('contentPlatformFieldId', this.contentTableConfig.fields.platform),
            approved: this.getFieldKey('contentApprovedFieldId', this.contentTableConfig.fields.approved),
            createdAt: this.contentTableConfig.fields.createdAt,
            storageUrl: this.getFieldKey('contentStorageUrlFieldId', this.contentTableConfig.fields.storageUrl),
            source: this.contentTableConfig.fields.source,
            queueJob: this.contentTableConfig.fields.queueJob,
            promptSource: this.contentTableConfig.fields.promptSource,
            publishTo: this.getFieldKey('contentPublishToFieldId', this.contentTableConfig.fields.publishTo),
        };
    }

    private getContentMediaFields() {
        return {
            name: this.getFieldKey('contentMediaNameFieldId', this.contentMediaTableConfig.fields.name),
            content: this.getFieldKey('contentMediaContentFieldId', this.contentMediaTableConfig.fields.content),
            influencer: this.getFieldKey('contentMediaInfluencerFieldId', this.contentMediaTableConfig.fields.influencer),
            mediaUrl: this.getFieldKey('contentMediaUrlFieldId', this.contentMediaTableConfig.fields.mediaUrl),
            storageUrl: this.getFieldKey('contentMediaStorageUrlFieldId', this.contentMediaTableConfig.fields.storageUrl),
            mediaType: this.getFieldKey('contentMediaTypeFieldId', this.contentMediaTableConfig.fields.mediaType),
            order: this.getFieldKey('contentMediaOrderFieldId', this.contentMediaTableConfig.fields.order),
        };
    }

    private getAssetFields() {
        return {
            name: this.getFieldKey('assetNameFieldId', this.assetsTableConfig.fields.name),
            type: this.getFieldKey('assetTypeFieldId', this.assetsTableConfig.fields.type),
            provider: this.getFieldKey('assetProviderFieldId', this.assetsTableConfig.fields.provider),
            sourceUrl: this.getFieldKey('assetSourceUrlFieldId', this.assetsTableConfig.fields.sourceUrl),
            trigger: this.getFieldKey('assetTriggerFieldId', this.assetsTableConfig.fields.trigger),
            strength: this.getFieldKey('assetStrengthFieldId', this.assetsTableConfig.fields.strength),
            linkedInfluencer: this.getFieldKey('assetInfluencerFieldId', this.assetsTableConfig.fields.linkedInfluencer),
            file: this.getFieldKey('assetFileFieldId', this.assetsTableConfig.fields.file)
        };
    }

    getTableNames(): string[] {
        try {
            return this.base.tables.map((table: any) => table.name);
        } catch {
            return [];
        }
    }

    /**
     * Save a generation record to Airtable
     */
    async saveGeneration(record: Omit<GenerationRecord, 'id' | 'createdAt'>): Promise<string | null> {
        try {
            const table = this.getTable(this.tableConfig.name);
            if (!table) return null;

            const recordData: { [fieldName: string]: any } = {};
            recordData[this.tableConfig.fields.prompt] = record.prompt;
            recordData[this.tableConfig.fields.model] = record.model;
            recordData[this.tableConfig.fields.type] = record.type;
            recordData[this.tableConfig.fields.status] = record.status;
            recordData[this.tableConfig.fields.resultUrl] = record.resultUrl || '';
            recordData[this.tableConfig.fields.createdAt] = new Date().toISOString();
            recordData[this.tableConfig.fields.cost] = record.cost || 0;

            if (table.checkPermissionsForCreateRecord(recordData).hasPermission) {
                const createdRecordId = await table.createRecordAsync(recordData);
                return createdRecordId;
            } else {
                console.warn('Insufficient permissions to create record in table:', this.tableConfig.name);
                return null;
            }
        } catch (error) {
            console.error('Error saving generation:', error);
            return null;
        }
    }

    /**
     * Get influencer profiles from Airtable
     */
    async getInfluencerProfiles(): Promise<InfluencerProfileRecord[]> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) return [];
            const influencerFields = this.getInfluencerFields();

            const query = table.selectRecordsAsync();
            const records = await query;

            return records.records.map((record: any) => {
                const avatarCell = this.getCellValueIfExists(record, table, influencerFields.avatar);
                let avatarUrl = undefined;
                if (Array.isArray(avatarCell) && avatarCell.length > 0) {
                    avatarUrl = avatarCell[0].url;
                }
                const fanvueLinked = this.getCellValueIfExists(record, table, influencerFields.fanvueAccount) as any[] | null;

                return {
                    id: record.id,
                    name: this.getCellValueAsStringIfExists(record, table, influencerFields.name) || '',
                    age: this.getCellValueAsStringIfExists(record, table, influencerFields.age) || '25',
                    gender: this.getCellValueAsStringIfExists(record, table, influencerFields.gender) || 'female',
                    origin: this.getCellValueAsStringIfExists(record, table, influencerFields.origin) || '',
                    niche: this.getCellValueAsStringIfExists(record, table, influencerFields.niche) || 'fashion',
                    style: this.getCellValueAsStringIfExists(record, table, influencerFields.style) || 'glamour',
                    status: this.getCellValueAsStringIfExists(record, table, influencerFields.status) || 'Active',
                    approved: Boolean(this.getCellValueIfExists(record, table, influencerFields.approved)),
                    avatarUrl: avatarUrl,
                    avatar: Array.isArray(avatarCell) ? avatarCell : [],
                    fanvueAccountRecordIds: Array.isArray(fanvueLinked) ? fanvueLinked.map((item: any) => item.id) : [],
                    fanvueCreatorUuid: this.getCellValueAsStringIfExists(record, table, influencerFields.fanvueCreatorUuid),
                    mainCharacterLora: this.getCellValueAsStringIfExists(record, table, influencerFields.mainCharacterLora),
                    totalGenerations: this.getCellValueIfExists(record, table, influencerFields.totalGenerations) || 0,
                    lastActive: new Date(this.getCellValueAsStringIfExists(record, table, influencerFields.lastActive) || Date.now())
                } as InfluencerProfileRecord;
            });
        } catch (error) {
            console.error('Error fetching profiles:', error);
            return [];
        }
    }

    /**
     * Get custom models/LoRAs from Airtable config
     */
    async getCustomModels(): Promise<any[]> {
        try {
            const table = this.getTable(this.modelsTableConfig.name);
            if (!table) return [];

            const query = table.selectRecordsAsync();
            const records = await query;

            return records.records.map((record: any) => ({
                id: record.id,
                name: record.getCellValueAsString(this.modelsTableConfig.fields.name),
                apiId: record.getCellValueAsString(this.modelsTableConfig.fields.id),
                type: record.getCellValueAsString(this.modelsTableConfig.fields.type),
                provider: record.getCellValueAsString(this.modelsTableConfig.fields.provider),
                tags: ['custom']
            }));
        } catch (error) {
            console.error('Error fetching custom models:', error);
            return [];
        }
    }

    async getAssets(): Promise<AssetRecord[]> {
        try {
            const table = this.getTable(this.assetsTableConfig.name);
            if (!table) return [];
            const assetFields = this.getAssetFields();

            const query = table.selectRecordsAsync();
            const records = await query;

            return records.records.map((record: any) => {
                const linked = this.getCellValueIfExists(record, table, assetFields.linkedInfluencer) as any[] | null;
                const fileCell = this.getCellValueIfExists(record, table, assetFields.file) as any[] | null;
                return {
                    id: record.id,
                    name: this.getCellValueAsStringIfExists(record, table, assetFields.name),
                    type: this.getCellValueAsStringIfExists(record, table, assetFields.type),
                    provider: this.getCellValueAsStringIfExists(record, table, assetFields.provider),
                    sourceUrl: this.getCellValueAsStringIfExists(record, table, assetFields.sourceUrl),
                    trigger: this.getCellValueAsStringIfExists(record, table, assetFields.trigger),
                    strength: Number(this.getCellValueIfExists(record, table, assetFields.strength)) || undefined,
                    linkedInfluencerIds: Array.isArray(linked) ? linked.map((item: any) => item.id) : [],
                    fileUrl: Array.isArray(fileCell) && fileCell.length > 0 ? fileCell[0].url : undefined
                } as AssetRecord;
            });
        } catch (error) {
            console.error('Error fetching assets:', error);
            return [];
        }
    }

    async createAssetRecord(payload: {
        name: string;
        type: string;
        provider: string;
        sourceUrl?: string;
        trigger?: string;
        strength?: number;
        influencerId?: string;
    }): Promise<string | null> {
        try {
            const table = this.getTable(this.assetsTableConfig.name);
            if (!table) return null;
            const assetFields = this.getAssetFields();

            const recordData: { [fieldName: string]: any } = {};
            this.setFieldIfExists(table, assetFields.name, payload.name, recordData);
            this.setFieldIfExists(table, assetFields.type, this.buildSingleSelectValue(table, assetFields.type, payload.type), recordData);
            this.setFieldIfExists(table, assetFields.provider, payload.provider, recordData);
            if (payload.sourceUrl) this.setFieldIfExists(table, assetFields.sourceUrl, payload.sourceUrl, recordData);
            if (payload.trigger) this.setFieldIfExists(table, assetFields.trigger, payload.trigger, recordData);
            if (payload.strength) this.setFieldIfExists(table, assetFields.strength, payload.strength, recordData);
            if (payload.influencerId) this.setFieldIfExists(table, assetFields.linkedInfluencer, [{ id: payload.influencerId }], recordData);

            const permission = table.checkPermissionsForCreateRecord(recordData);
            if (!permission.hasPermission) return null;
            return await table.createRecordAsync(recordData);
        } catch (error) {
            console.error('Error creating asset record:', error);
            return null;
        }
    }

    async getJobs(): Promise<JobRecord[]> {
        try {
            const table = this.getTable(this.jobsTableConfig.name);
            if (!table) return [];

            const query = table.selectRecordsAsync();
            const records = await query;

            return records.records.map((record: any) => {
                const linked = this.getCellValueIfExists(record, table, this.jobsTableConfig.fields.influencer) as any[] | null;
                const createdAtString = this.getCellValueAsStringIfExists(record, table, this.jobsTableConfig.fields.createdAt);
                return {
                    id: record.id,
                    influencerIds: Array.isArray(linked) ? linked.map((item: any) => item.id) : [],
                    presetName: this.getCellValueAsStringIfExists(record, table, this.jobsTableConfig.fields.preset),
                    status: this.getCellValueAsStringIfExists(record, table, this.jobsTableConfig.fields.status),
                    resultUrl: this.getCellValueAsStringIfExists(record, table, this.jobsTableConfig.fields.resultUrl),
                    cost: Number(this.getCellValueIfExists(record, table, this.jobsTableConfig.fields.cost)) || undefined,
                    createdAt: createdAtString ? new Date(createdAtString) : undefined,
                    outputType: this.getCellValueAsStringIfExists(record, table, this.jobsTableConfig.fields.outputType)
                } as JobRecord;
            });
        } catch (error) {
            console.error('Error fetching jobs:', error);
            return [];
        }
    }



    async getPresets(): Promise<PresetRecord[]> {
        try {
            const table = this.getTable(this.presetsTableConfig.name);
            if (!table) return [];

            const query = table.selectRecordsAsync();
            const records = await query;

            return records.records.map((record: any) => {
                const platform = record.getCellValueAsString(this.presetsTableConfig.fields.platform);
                const promptTemplate = record.getCellValueAsString(this.presetsTableConfig.fields.promptTemplate);
                const defaultProvider = record.getCellValueAsString(this.presetsTableConfig.fields.defaultProvider);
                const defaultModel = record.getCellValueAsString(this.presetsTableConfig.fields.defaultModel);
                return {
                    id: record.id,
                    name: record.getCellValueAsString(this.presetsTableConfig.fields.name),
                    goal: record.getCellValueAsString(this.presetsTableConfig.fields.goal),
                    platform,
                    promptTemplate,
                    defaultProvider,
                    defaultModel,
                    active: record.getCellValueAsString(this.presetsTableConfig.fields.active),
                    defaults: {
                        provider: defaultProvider,
                        model: defaultModel,
                        style: record.getCellValueAsString(this.presetsTableConfig.fields.goal),
                        platform,
                        promptTemplate
                    }
                } as PresetRecord;
            });
        } catch (error) {
            console.error('Error fetching presets:', error);
            return [];
        }
    }

    async getFanvueAccounts(): Promise<FanvueAccountRecord[]> {
        try {
            const table = this.getTable(this.fanvueAccountsTableConfig.name);
            if (!table) return [];
            const query = table.selectRecordsAsync();
            const records = await query;
            return records.records.map((record: any) => {
                const linked = this.getCellValueIfExists(record, table, this.fanvueAccountsTableConfig.fields.influencer) as any[] | null;
                return {
                    id: record.id,
                    accountId: this.getCellValueAsStringIfExists(record, table, this.fanvueAccountsTableConfig.fields.accountId),
                    username: this.getCellValueAsStringIfExists(record, table, this.fanvueAccountsTableConfig.fields.username),
                    displayName: this.getCellValueAsStringIfExists(record, table, this.fanvueAccountsTableConfig.fields.displayName),
                    status: this.getCellValueAsStringIfExists(record, table, this.fanvueAccountsTableConfig.fields.status),
                    scopes: this.getCellValueAsStringIfExists(record, table, this.fanvueAccountsTableConfig.fields.scopes),
                    influencerIds: Array.isArray(linked) ? linked.map((item: any) => item.id) : [],
                    lastSyncAt: this.getCellValueAsStringIfExists(record, table, this.fanvueAccountsTableConfig.fields.lastSyncAt),
                } as FanvueAccountRecord;
            });
        } catch (error) {
            console.error('Error fetching Fanvue accounts:', error);
            return [];
        }
    }

    async getFanvuePosts(limit: number = 100): Promise<FanvuePostRecord[]> {
        try {
            const table = this.getTable(this.fanvuePostsTableConfig.name);
            if (!table) return [];
            const query = table.selectRecordsAsync();
            const records = await query;
            return records.records.slice(0, limit).map((record: any) => {
                const influencerLinked = this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.influencer) as any[] | null;
                const contentLinked = this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.content) as any[] | null;
                const accountLinked = this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.fanvueAccount) as any[] | null;
                return {
                    id: record.id,
                    fanvuePostId: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.fanvuePostId),
                    status: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.status),
                    postUrl: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.postUrl),
                    caption: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.caption),
                    mediaUrl: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.mediaUrl),
                    mediaType: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.mediaType),
                    publishedAt: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.publishedAt),
                    lastSyncAt: this.getCellValueAsStringIfExists(record, table, this.fanvuePostsTableConfig.fields.lastSyncAt),
                    views: Number(this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.views)) || 0,
                    likes: Number(this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.likes)) || 0,
                    comments: Number(this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.comments)) || 0,
                    revenue: Number(this.getCellValueIfExists(record, table, this.fanvuePostsTableConfig.fields.revenue)) || 0,
                    influencerIds: Array.isArray(influencerLinked) ? influencerLinked.map((item: any) => item.id) : [],
                    contentIds: Array.isArray(contentLinked) ? contentLinked.map((item: any) => item.id) : [],
                    accountIds: Array.isArray(accountLinked) ? accountLinked.map((item: any) => item.id) : [],
                } as FanvuePostRecord;
            });
        } catch (error) {
            console.error('Error fetching Fanvue posts:', error);
            return [];
        }
    }

    async getContentMedia(limit: number = 500): Promise<ContentMediaRecord[]> {
        try {
            const table = this.getTable(this.contentMediaTableConfig.name);
            if (!table) return [];
            const mediaFields = this.getContentMediaFields();
            const query = table.selectRecordsAsync();
            const records = await query;
            return records.records.slice(0, limit).map((record: any) => {
                const contentLinked = this.getCellValueIfExists(record, table, mediaFields.content) as any[] | null;
                const influencerLinked = this.getCellValueIfExists(record, table, mediaFields.influencer) as any[] | null;
                return {
                    id: record.id,
                    name: this.getCellValueAsStringIfExists(record, table, mediaFields.name),
                    contentIds: Array.isArray(contentLinked) ? contentLinked.map((item: any) => item.id) : [],
                    influencerIds: Array.isArray(influencerLinked) ? influencerLinked.map((item: any) => item.id) : [],
                    mediaUrl: this.getCellValueAsStringIfExists(record, table, mediaFields.mediaUrl),
                    storageUrl: this.getCellValueAsStringIfExists(record, table, mediaFields.storageUrl),
                    mediaType: this.getCellValueAsStringIfExists(record, table, mediaFields.mediaType),
                    order: Number(this.getCellValueIfExists(record, table, mediaFields.order)) || 0,
                } as ContentMediaRecord;
            });
        } catch (error) {
            console.error('Error fetching content media:', error);
            return [];
        }
    }

    async createContentMediaRecord(payload: {
        contentId: string;
        influencerId?: string;
        name?: string;
        mediaUrl?: string;
        storageUrl?: string;
        mediaType?: string;
        order?: number;
    }): Promise<string | null> {
        try {
            const table = this.getTable(this.contentMediaTableConfig.name);
            if (!table) return null;
            const mediaFields = this.getContentMediaFields();

            const recordData: { [fieldName: string]: any } = {};
            this.setFieldIfExists(table, mediaFields.name, payload.name || 'Media item', recordData);
            this.setFieldIfExists(table, mediaFields.content, [{ id: payload.contentId }], recordData);
            if (payload.influencerId) {
                this.setFieldIfExists(table, mediaFields.influencer, [{ id: payload.influencerId }], recordData);
            }
            if (payload.mediaUrl) {
                this.setFieldIfExists(table, mediaFields.mediaUrl, payload.mediaUrl, recordData);
            }
            if (payload.storageUrl || payload.mediaUrl) {
                this.setFieldIfExists(table, mediaFields.storageUrl, payload.storageUrl || payload.mediaUrl, recordData);
            }
            if (payload.mediaType) {
                this.setFieldIfExists(
                    table,
                    mediaFields.mediaType,
                    this.buildSingleSelectValue(table, mediaFields.mediaType, payload.mediaType),
                    recordData
                );
            }
            this.setFieldIfExists(table, mediaFields.order, payload.order || 1, recordData);

            const permission = table.checkPermissionsForCreateRecord(recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to create content media:', permission.reasonDisplayString);
                return null;
            }
            return await table.createRecordAsync(recordData);
        } catch (error) {
            console.error('Error creating content media:', error);
            return null;
        }
    }

    async updateContentMediaRecord(mediaId: string, updates: {
        name?: string;
        mediaUrl?: string;
        storageUrl?: string;
        mediaType?: string;
        order?: number;
    }): Promise<boolean> {
        try {
            const table = this.getTable(this.contentMediaTableConfig.name);
            if (!table) return false;
            const mediaFields = this.getContentMediaFields();
            const recordData: { [fieldName: string]: any } = {};
            if (updates.name !== undefined) {
                this.setFieldIfExists(table, mediaFields.name, updates.name, recordData);
            }
            if (updates.mediaUrl !== undefined) {
                this.setFieldIfExists(table, mediaFields.mediaUrl, updates.mediaUrl, recordData);
            }
            if (updates.storageUrl !== undefined) {
                this.setFieldIfExists(table, mediaFields.storageUrl, updates.storageUrl, recordData);
            }
            if (updates.mediaType !== undefined) {
                this.setFieldIfExists(
                    table,
                    mediaFields.mediaType,
                    this.buildSingleSelectValue(table, mediaFields.mediaType, updates.mediaType),
                    recordData
                );
            }
            if (updates.order !== undefined) {
                this.setFieldIfExists(table, mediaFields.order, updates.order, recordData);
            }
            if (!Object.keys(recordData).length) return true;
            const permission = table.checkPermissionsForUpdateRecord(mediaId, recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to update content media:', permission.reasonDisplayString);
                return false;
            }
            await table.updateRecordAsync(mediaId, recordData);
            return true;
        } catch (error) {
            console.error('Error updating content media:', error);
            return false;
        }
    }

    async deleteContentMediaRecord(mediaId: string): Promise<boolean> {
        try {
            const table = this.getTable(this.contentMediaTableConfig.name);
            if (!table) return false;
            const permission = (table as any).checkPermissionsForDeleteRecord?.(mediaId);
            if (permission && !permission.hasPermission) {
                console.warn('Insufficient permissions to delete content media:', permission.reasonDisplayString);
                return false;
            }
            await table.deleteRecordAsync(mediaId);
            return true;
        } catch (error) {
            console.error('Error deleting content media:', error);
            return false;
        }
    }

    async getPrompts(): Promise<PromptRecord[]> {
        try {
            const table = this.getTable(this.promptsTableConfig.name);
            if (!table) return [];

            const query = table.selectRecordsAsync();
            const records = await query;

            return records.records.map((record: any) => {
                const linked = record.getCellValue(this.promptsTableConfig.fields.influencer) as any[] | null;
                const reference = record.getCellValue(this.promptsTableConfig.fields.referenceImage) as any[] | null;
                return {
                    id: record.id,
                    prompt: record.getCellValueAsString(this.promptsTableConfig.fields.prompt),
                    influencerIds: Array.isArray(linked) ? linked.map((item: any) => item.id) : [],
                    influencerName: record.getCellValueAsString(this.promptsTableConfig.fields.influencer),
                    style: record.getCellValueAsString(this.promptsTableConfig.fields.style),
                    platform: record.getCellValueAsString(this.promptsTableConfig.fields.platform),
                    status: record.getCellValueAsString(this.promptsTableConfig.fields.status),
                    referenceImageUrl: Array.isArray(reference) && reference.length > 0 ? reference[0].url : undefined
                } as PromptRecord;
            });
        } catch (error) {
            console.error('Error fetching prompts:', error);
            return [];
        }
    }

    async updatePromptStatus(promptIds: string[], status: string): Promise<boolean> {
        try {
            const table = this.getTable(this.promptsTableConfig.name);
            if (!table || !promptIds.length) return false;

            const updates = promptIds.map((id) => ({
                id,
                fields: {
                    [this.promptsTableConfig.fields.status]: status
                }
            }));

            const permission = table.checkPermissionsForUpdateRecords(updates);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to update prompts:', permission.reasonDisplayString);
                return false;
            }

            await table.updateRecordsAsync(updates);
            return true;
        } catch (error) {
            console.error('Error updating prompt status:', error);
            return false;
        }
    }

    /**
     * Create or update influencer profile
     */
    async saveInfluencerProfile(profile: Omit<InfluencerProfileRecord, 'id' | 'totalGenerations' | 'lastActive'> & { avatarUrl?: string }): Promise<string | null> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) {
                console.warn('Missing table:', this.influencerTableConfig.name);
                return null;
            }
            const influencerFields = this.getInfluencerFields();

            const recordData: { [fieldName: string]: any } = {};
            this.setFieldIfExists(table, influencerFields.name, profile.name, recordData);
            
            const ageField = (table as any).getFieldByIdIfExists?.(influencerFields.age) || (table as any).getFieldByNameIfExists?.(influencerFields.age) || table.getFieldByName(influencerFields.age);
            if (ageField && ageField.type === 'number') {
                const parsedAge = Number(profile.age);
                this.setFieldIfExists(table, influencerFields.age, Number.isFinite(parsedAge) ? parsedAge : 25, recordData);
            } else {
                this.setFieldIfExists(table, influencerFields.age, String(profile.age || '25'), recordData);
            }

            const genderValue = profile.gender ? profile.gender.trim().toLowerCase() : 'female';
            this.setFieldIfExists(table, influencerFields.gender, genderValue, recordData);
            this.setFieldIfExists(table, influencerFields.niche, profile.niche, recordData);
            this.setFieldIfExists(table, influencerFields.style, profile.style, recordData);
            this.setFieldIfExists(table, influencerFields.origin, profile.origin, recordData);
            this.setFieldIfExists(table, influencerFields.status, 'Active', recordData);
            this.setFieldIfExists(table, influencerFields.approved, false, recordData);
            if (profile.avatarUrl && /^https?:\/\//i.test(profile.avatarUrl)) {
                this.setFieldIfExists(table, influencerFields.avatar, [{ url: profile.avatarUrl }], recordData);
            }

            const permission = table.checkPermissionsForCreateRecord(recordData);
            if (permission.hasPermission) {
                return await table.createRecordAsync(recordData);
            } else {
                console.warn('Insufficient permissions to create record in table:', this.influencerTableConfig.name, permission.reasonDisplayString);
                return null;
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            return null;
        }
    }






    private async findInfluencerIdByName(name: string): Promise<string | null> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table || !name) return null;
            const query = table.selectRecordsAsync();
            const records = await query;
            const match = records.records.find((record: any) =>
                record.getCellValueAsString(this.influencerTableConfig.fields.name).toLowerCase() === name.toLowerCase()
            );
            return match ? match.id : null;
        } catch {
            return null;
        }
    }

    async getContentRecords(limit: number = 10): Promise<ContentRecord[]> {
        try {
            const table = this.getTable(this.contentTableConfig.name);
            if (!table) return [];

            const query = table.selectRecordsAsync();
            const records = await query;
            const items = records.records.map((record: any) => {
                const mediaCell = this.getCellValueIfExists(record, table, this.contentTableConfig.fields.media) as any[] | null;
                const linked = this.getCellValueIfExists(record, table, this.contentTableConfig.fields.influencer) as any[] | null;
                return {
                    id: record.id,
                    name: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.name),
                    status: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.status),
                    prompt: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.prompt),
                    mediaUrl: Array.isArray(mediaCell) && mediaCell.length > 0 ? mediaCell[0].url : undefined,
                    storageUrl: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.storageUrl),
                    cost: this.getCellValueAsStringIfExists(record, table, 'Cost'),
                    duration: this.getCellValueAsStringIfExists(record, table, 'Duration'),
                    type: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.type),
                    platform: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.platform),
                    provider: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.provider),
                    model: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.model),
                    createdAt: this.getCellValueAsStringIfExists(record, table, this.contentTableConfig.fields.createdAt),
                    approved: Boolean(this.getCellValueIfExists(record, table, this.contentTableConfig.fields.approved)),
                    influencerIds: Array.isArray(linked) ? linked.map((item: any) => item.id) : [],
                };
            });
            return items.slice(0, limit);
        } catch (error) {
            console.error('Error fetching content records:', error);
            return [];
        }
    }

    async saveContentRecord(payload: {
        influencerId?: string;
        name?: string;
        age?: number;
        niche?: string;
        style?: string;
        status?: string;
        prompt?: string;
        model?: string;
        provider?: string;
        type?: string;
        platform?: string;
        approved?: boolean;
        createdAt?: string;
        storageUrl?: string;
        source?: string;
        queueJobId?: string;
        promptRecordId?: string;
        mediaUrl: string;
    }): Promise<string | null> {
        try {
            const table = this.getTable(this.contentTableConfig.name);
            if (!table) return null;

            const recordData: { [fieldName: string]: any } = {};
            let fallbackInfluencerId: string | null = null;
            if (!payload.influencerId && payload.name) {
                fallbackInfluencerId = await this.findInfluencerIdByName(payload.name);
            }
            const influencerId = payload.influencerId || fallbackInfluencerId;
            const contentFields = this.getContentFields();
            if (influencerId) {
                this.setFieldIfExists(table, contentFields.influencer, [{ id: influencerId }], recordData);
            }
            this.setFieldIfExists(table, contentFields.name, payload.name || 'Generated content', recordData);
            if (payload.status) this.setFieldIfExists(table, contentFields.status, payload.status || 'Approved', recordData);
            if (payload.prompt) this.setFieldIfExists(table, contentFields.prompt, payload.prompt, recordData);
            if (payload.model) this.setFieldIfExists(table, contentFields.model, payload.model, recordData);
            if (payload.provider) this.setFieldIfExists(table, contentFields.provider, payload.provider, recordData);
            if (payload.type) this.setFieldIfExists(table, contentFields.type, payload.type, recordData);
            if (payload.platform) this.setFieldIfExists(table, contentFields.platform, this.buildSingleSelectValue(table, contentFields.platform, payload.platform), recordData);
            if (payload.approved !== undefined) this.setFieldIfExists(table, contentFields.approved, payload.approved, recordData);
            if (payload.createdAt) this.setFieldIfExists(table, contentFields.createdAt, payload.createdAt, recordData);
            if (payload.storageUrl || payload.mediaUrl) this.setFieldIfExists(table, contentFields.storageUrl, payload.storageUrl || payload.mediaUrl, recordData);
            if (payload.source) this.setFieldIfExists(table, contentFields.source, this.buildSingleSelectValue(table, contentFields.source, payload.source), recordData);
            if (payload.queueJobId) this.setFieldIfExists(table, contentFields.queueJob, [{ id: payload.queueJobId }], recordData);
            if (payload.promptRecordId) this.setFieldIfExists(table, contentFields.promptSource, [{ id: payload.promptRecordId }], recordData);
            this.setFieldIfExists(table, contentFields.media, [{ url: payload.mediaUrl }], recordData);

            const permission = table.checkPermissionsForCreateRecord(recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to create content record:', permission.reasonDisplayString);
                return null;
            }

            return await table.createRecordAsync(recordData);
        } catch (error) {
            console.error('Error saving content record:', error);
            return null;
        }
    }



    async updateInfluencerProfile(profileId: string, updates: { name?: string; age?: string; gender?: string; niche?: string; style?: string; avatarUrl?: string; fanvueCreatorUuid?: string }): Promise<boolean> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) return false;
            const influencerFields = this.getInfluencerFields();

            const recordData: { [fieldName: string]: any } = {};
            if (updates.name !== undefined) recordData[influencerFields.name] = updates.name;
            if (updates.age !== undefined) {
                const parsedAge = Number(updates.age);
                recordData[influencerFields.age] = Number.isFinite(parsedAge) ? parsedAge : 25;
            }
            if (updates.gender !== undefined) {
                const genderValue = updates.gender ? updates.gender.trim().toLowerCase() : 'female';
                const genderName = genderValue;
                recordData[influencerFields.gender] = this.buildSingleSelectValue(
                    table,
                    influencerFields.gender,
                    genderName
                );
            }
            if (updates.niche !== undefined) recordData[influencerFields.niche] = updates.niche;
            if (updates.style !== undefined) recordData[influencerFields.style] = updates.style;
            if (updates.avatarUrl && /^https?:\/\//i.test(updates.avatarUrl)) {
                this.setFieldIfExists(table, influencerFields.avatar, [{ url: updates.avatarUrl }], recordData);
            }
            if (updates.fanvueCreatorUuid !== undefined) {
                this.setFieldIfExists(table, influencerFields.fanvueCreatorUuid, updates.fanvueCreatorUuid, recordData);
            }

            if (!Object.keys(recordData).length) return true;

            const permission = table.checkPermissionsForUpdateRecord(profileId, recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to update profile:', permission.reasonDisplayString);
                return false;
            }

            await table.updateRecordAsync(profileId, recordData);
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    }

    async setInfluencerStatus(profileId: string, status: 'Active' | 'Archived'): Promise<boolean> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) return false;
            const influencerFields = this.getInfluencerFields();
            const recordData: { [fieldName: string]: any } = {};
            this.setFieldIfExists(table, influencerFields.status, status, recordData);
            if (!Object.keys(recordData).length) return false;
            const permission = table.checkPermissionsForUpdateRecord(profileId, recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to update status:', permission.reasonDisplayString);
                return false;
            }
            await table.updateRecordAsync(profileId, recordData);
            return true;
        } catch (error) {
            console.error('Error updating status:', error);
            return false;
        }
    }

    async setInfluencerApproved(profileId: string, approved: boolean): Promise<boolean> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) return false;
            const influencerFields = this.getInfluencerFields();
            const recordData: { [fieldName: string]: any } = {};
            this.setFieldIfExists(table, influencerFields.approved, approved, recordData);
            if (!Object.keys(recordData).length) return false;
            const permission = table.checkPermissionsForUpdateRecord(profileId, recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to update approval:', permission.reasonDisplayString);
                return false;
            }
            await table.updateRecordAsync(profileId, recordData);
            return true;
        } catch (error) {
            console.error('Error updating approval:', error);
            return false;
        }
    }

    async setInfluencerFanvueAccount(profileId: string, fanvueAccountRecordId?: string | null): Promise<boolean> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) return false;
            const influencerFields = this.getInfluencerFields();
            const recordData: { [fieldName: string]: any } = {};
            // Linked record fields expect an array of objects: [{ id: 'recXXXX' }]
            this.setFieldIfExists(
                table,
                influencerFields.fanvueAccount,
                fanvueAccountRecordId ? [{ id: fanvueAccountRecordId }] : [],
                recordData
            );
            if (!Object.keys(recordData).length) return false;
            const permission = table.checkPermissionsForUpdateRecord(profileId, recordData);
            if (!permission.hasPermission) {
                console.warn('Insufficient permissions to update Fanvue account:', permission.reasonDisplayString);
                return false;
            }
            await table.updateRecordAsync(profileId, recordData);
            return true;
        } catch (error) {
            console.error('Error updating Fanvue account:', error);
            return false;
        }
    }
    async testInfluencerWrite(): Promise<{ ok: boolean; message: string }> {
        try {
            const table = this.getTable(this.influencerTableConfig.name);
            if (!table) {
                return { ok: false, message: `Missing table: ${this.influencerTableConfig.name}` };
            }
            const influencerFields = this.getInfluencerFields();

            const recordData: { [fieldName: string]: any } = {};
            recordData[influencerFields.name] = 'Test Influencer';
            recordData[influencerFields.age] = 25;
            recordData[influencerFields.gender] = this.buildSingleSelectValue(
                table,
                influencerFields.gender,
                'Female'
            );
            recordData[influencerFields.niche] = 'fashion';
            recordData[influencerFields.style] = 'glamour';

            const permission = table.checkPermissionsForCreateRecord(recordData);
            if (!permission.hasPermission) {
                return {
                    ok: false,
                    message: `No permission to create record: ${permission.reasonDisplayString || 'unknown reason'}`
                };
            }

            const recordId = await table.createRecordAsync(recordData);
            await table.deleteRecordAsync(recordId);
            return { ok: true, message: 'Write test succeeded.' };
        } catch (error) {
            console.error('Test write failed:', error);
            return { ok: false, message: `Write test failed: ${String(error)}` };
        }
    }
}
