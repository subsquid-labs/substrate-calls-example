import {lookupArchive} from '@subsquid/archive-registry'
import {
    BatchContext,
    BatchProcessorCallItem,
    BatchProcessorEventItem,
    BatchProcessorItem,
    SubstrateBatchProcessor,
} from '@subsquid/substrate-processor'

export const processor = new SubstrateBatchProcessor()
    .setDataSource({
        archive: lookupArchive('kusama', {release: 'FireSquid'}),
    })
    .addCall('Identity.set_identity', {
        data: {
            call: {
                args: true,
                origin: true,
            },
        },
    } as const)
    .addCall('Identity.clear_indentity', {
        data: {
            call: {
                args: true,
                origin: true,
            },
        },
    } as const)

export type Item = BatchProcessorItem<typeof processor>
export type EventItem = BatchProcessorEventItem<typeof processor>
export type CallItem = BatchProcessorCallItem<typeof processor>
export type ProcessorContext<Store> = BatchContext<Store, Item>
