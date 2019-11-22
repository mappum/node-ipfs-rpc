'use strict'

const CID = require('cids')
const multiaddr = require('multiaddr')
const ndjson = require('iterable-ndjson')
const configure = require('../lib/configure')
const toIterable = require('../lib/stream-to-iterable')

module.exports = configure(({ ky }) => {
  return async function * findPeer (peerId, options) {
    options = options || {}

    const searchParams = new URLSearchParams(options.searchParams)
    searchParams.set('arg', `${peerId}`)
    if (options.verbose != null) searchParams.set('verbose', options.verbose)

    const res = await ky.post('dht/findpeer', {
      timeout: options.timeout,
      signal: options.signal,
      headers: options.headers,
      searchParams
    })

    for await (const message of ndjson(toIterable(res.body))) {
      // 2 = FinalPeer
      // https://github.com/libp2p/go-libp2p-core/blob/6e566d10f4a5447317a66d64c7459954b969bdab/routing/query.go#L18
      if (message.Type === 2 && message.Responses) {
        for (const { ID, Addrs } of message.Responses) {
          yield {
            id: new CID(ID),
            addrs: (Addrs || []).map(a => multiaddr(a))
          }
        }
      }
    }
  }
})
