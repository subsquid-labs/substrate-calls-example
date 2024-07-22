import {In} from 'typeorm'
import * as ss58 from '@subsquid/ss58'
import {decodeHex} from '@subsquid/substrate-processor'
import {Store, TypeormDatabase} from '@subsquid/typeorm-store'
import {Account} from './model'
import {Call, ProcessorContext, processor} from './processor'
import {calls} from './types'

processor.run(new TypeormDatabase(), async (ctx) => {
    let identitiesData: IdentityData[] = []

    for (let block of ctx.blocks) {
        for (let call of block.calls) {
            if (!call.success) continue

            switch (call.name) {
                case calls.identity.setIdentity.name: {
                    if (!call.origin) continue

                    let origin = getOriginAccountId(call.origin)
                    let data = getSetIdentity(ctx, call)
                    identitiesData.push({
                        id: encodeId(origin),
                        ...data,
                    })

                    break
                }
                case calls.identity.clearIdentity.name: {
                    if (!call.origin) continue

                    let origin = getOriginAccountId(call.origin)
                    identitiesData.push({
                        id: encodeId(origin),
                        display: null,
                        legal: null,
                        web: null,
                        riot: null,
                        email: null,
                        twitter: null,
                    })

                    break
                }
            }
        }
    }

    await saveIdentities(ctx, identitiesData)
})

interface IdentityData {
    id: string
    display: string | null
    legal: string | null
    web: string | null
    riot: string | null
    email: string | null
    twitter: string | null
}

async function saveIdentities(ctx: ProcessorContext<Store>, identitiesData: IdentityData[]) {
    let accountIds = new Set<string>()
    for (let i of identitiesData) {
        accountIds.add(i.id)
    }

    let accounts = await ctx.store.findBy(Account, {id: In([...accountIds])}).then((accounts) => {
        return new Map(accounts.map((a) => [a.id, a]))
    })

    for (let i of identitiesData) {
        let account = getAccount(accounts, i.id)
        account.display = i.display
        account.email = i.email
        account.legal = i.legal
        account.riot = i.riot
        account.twitter = i.twitter
        account.web = i.web
    }

    await ctx.store.upsert([...accounts.values()])
}

function getAccount(m: Map<string, Account>, id: string): Account {
    let acc = m.get(id)
    if (acc == null) {
        acc = new Account()
        acc.id = id
        m.set(id, acc)
    }
    return acc
}

export function getOriginAccountId(origin: any): Uint8Array {
    if (origin && origin.__kind === 'system' && origin.value.__kind === 'Signed') {
        const id = origin.value.value
        if (id.__kind === 'Id') {
            return decodeHex(id.value)
        } else {
            return decodeHex(id)
        }
    } else {
        throw new Error('Unexpected origin')
    }
}

function encodeId(id: Uint8Array): string {
    return ss58.codec('kusama').encode(id)
}

function getSetIdentity(ctx: ProcessorContext<Store>, call: Call) {
    if (calls.identity.setIdentity.v1030.is(call)) {
        let {info} = calls.identity.setIdentity.v1030.decode(call)
        return {
            display: unwrapData(info.display),
            legal: unwrapData(info.legal),
            web: unwrapData(info.web),
            riot: unwrapData(info.riot),
            email: unwrapData(info.email),
            twitter: null,
        }
    } else if (calls.identity.setIdentity.v1032.is(call)) {
        let {info} = calls.identity.setIdentity.v1032.decode(call)
        return {
            display: unwrapData(info.display),
            legal: unwrapData(info.legal),
            web: unwrapData(info.web),
            riot: unwrapData(info.riot),
            email: unwrapData(info.email),
            twitter: unwrapData(info.twitter),
        }
    } else {
        throw new UknownVersionError()
    }
}

function unwrapData(data: {__kind: string; value?: string}) {
    switch (data.__kind) {
        case 'None':
        case 'BlakeTwo256':
        case 'Sha256':
        case 'Keccak256':
        case 'ShaThree256':
            return null
        default:
            return data.value==undefined ? null : Buffer.from(data.value.slice(2), 'hex').toString()
    }
}

class UknownVersionError extends Error {
    constructor() {
        super('Unknown verson')
    }
}
