/* eslint-disable @typescript-eslint/no-require-imports */
require('ts-node/register')

const assert = require('node:assert/strict')
const { buildGroupSizeOr, computeHasMore, normalizeEnvironment, searchSchema } = require('../../app/api/games/search/helpers')

// Smoke checks for browse search helper utilities (run via ts-node/register)
assert.equal(normalizeEnvironment('both'), null)
assert.equal(normalizeEnvironment('indoor'), 'indoor')
assert.equal(normalizeEnvironment(undefined), undefined)

assert.equal(buildGroupSizeOr([]), null)
const small = buildGroupSizeOr(['small'])
assert.equal(small, 'and(min_players.lte.6)')
const largeAndMedium = buildGroupSizeOr(['large', 'medium'])
assert(largeAndMedium?.includes('min_players.gte.15'))
assert(largeAndMedium?.includes('min_players.gte.6,max_players.lte.14'))

assert.equal(computeHasMore(0, 1, 24), false)
assert.equal(computeHasMore(25, 1, 24), true)
assert.equal(computeHasMore(24, 1, 24), false)
assert.equal(computeHasMore(48, 2, 24), false)

const parsed = searchSchema.parse({})
assert.equal(parsed.page, 1)
assert.equal(parsed.pageSize, 24)
const parsedSort = searchSchema.parse({ sort: 'rating' })
assert.equal(parsedSort.sort, 'rating')

console.log('browse search helper smoke tests passed')
