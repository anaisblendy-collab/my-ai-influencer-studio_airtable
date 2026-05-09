import TestDriver from '@airtable/blocks-testing';
import { AirtableService } from '../services/airtable';
import { FieldType, ViewType } from '@airtable/blocks/models';

describe('AirtableService', () => {
    let testDriver: any;
    let airtableService: AirtableService;

    beforeEach(() => {
        // Initialize TestDriver with a mock base schema
        testDriver = new TestDriver({
            base: {
                id: 'baseId',
                name: 'Test Base',
                color: 'blue',
                collaborators: [
                    { id: 'usr1', name: 'Test User', email: 'test@example.com', isActive: true }
                ],
                workspaceId: 'wsId',
                tables: [
                    {
                        id: 'tblContenus',
                        name: 'Contenus',
                        description: '',
                        views: [
                            {
                                id: 'viwAll',
                                name: 'All',
                                type: ViewType.GRID,
                                fieldOrder: {
                                    fieldIds: ['fldPrompt', 'fldModel', 'fldType', 'fldStatus', 'fldResultUrl', 'fldCreatedAt', 'fldCost'],
                                    visibleFieldCount: 7
                                },
                                records: [],
                                isLockedView: false
                            }
                        ],
                        records: [],
                        fields: [
                            { id: 'fldPrompt', name: 'Prompt', type: FieldType.SINGLE_LINE_TEXT, description: '', options: null },
                            { id: 'fldModel', name: 'Model', type: FieldType.SINGLE_LINE_TEXT, description: '', options: null },
                            { id: 'fldType', name: 'Type', type: FieldType.SINGLE_LINE_TEXT, description: '', options: null },
                            { id: 'fldStatus', name: 'Status', type: FieldType.SINGLE_LINE_TEXT, description: '', options: null },
                            { id: 'fldResultUrl', name: 'Result URL', type: FieldType.URL, description: '', options: null },
                            { id: 'fldCreatedAt', name: 'Created At', type: FieldType.DATE_TIME, description: '', options: { dateFormat: { name: 'local', format: 'l' }, timeFormat: { name: '24hour', format: 'HH:mm' }, timezone: 'utc' } },
                            { id: 'fldCost', name: 'Cost ($)', type: FieldType.NUMBER, description: '', options: { precision: 2 } },
                        ],
                    },
                ],
            },
        });
        airtableService = new AirtableService(testDriver.base);
    });

    test('saveGeneration successfully creates a record', async () => {
        const mockGeneration = {
            prompt: 'Test prompt',
            model: 'test-model',
            type: 'image' as const,
            status: 'completed' as const,
            resultUrl: 'https://example.com/image.png',
            cost: 0.1
        };

        const recordId = await airtableService.saveGeneration(mockGeneration);

        // Use non-null assertion or check for null
        expect(recordId).not.toBeNull();

        const table = testDriver.base.getTableByName('Contenus');
        const query = table.selectRecordsAsync();
        const records = await query;

        expect(records.records.length).toBe(1);
        expect(records.records[0].getCellValueAsString('Prompt')).toBe('Test prompt');
    });

    test('saveGeneration returns null if table does not exist', async () => {
        // Create an empty driver with correct structure
        const emptyDriver = new TestDriver({
            base: {
                id: 'baseId2',
                name: 'Empty Base',
                color: 'blue',
                collaborators: [
                    { id: 'usr2', name: 'Other User', email: 'other@example.com', isActive: true }
                ],
                workspaceId: 'wsId2',
                tables: [
                    {
                        id: 'tblDummy',
                        name: 'Dummy',
                        description: '',
                        views: [
                            {
                                id: 'viwDummy',
                                name: 'All',
                                type: ViewType.GRID,
                                fieldOrder: { fieldIds: ['fldDummy'], visibleFieldCount: 1 },
                                records: [],
                                isLockedView: false
                            }
                        ],
                        records: [],
                        fields: [
                            { id: 'fldDummy', name: 'Dummy', type: FieldType.SINGLE_LINE_TEXT, description: '', options: null }
                        ]
                    }
                ]
            }
        });
        const serviceWithNoTables = new AirtableService(emptyDriver.base);

        const result = await serviceWithNoTables.saveGeneration({
            prompt: 'wont work',
            model: 'none',
            type: 'image',
            status: 'pending'
        });

        expect(result).toBeNull();
    });
});
