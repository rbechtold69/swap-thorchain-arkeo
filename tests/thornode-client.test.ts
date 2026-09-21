import test from 'node:test'
import assert from 'node:assert/strict'
import { toThorBaseUnits, fromThorBaseUnits, fetchThorQuote, quoteEndpoints } from '../src/lib/thornode-client.ts'
const quote = () => ({memo:'=:ETH.ETH:test',inbound_address:'test-vault',expected_amount_out:'9007199254740993',expiry:Math.floor(Date.now()/1000)+60,fees:{liquidity:'1',outbound:'2'}})
test('amount conversion never uses floating-point arithmetic',()=>{
 assert.equal(toThorBaseUnits('0.00000001'),'1')
 assert.equal(toThorBaseUnits('90071992.54740993'),'9007199254740993')
 assert.equal(fromThorBaseUnits('9007199254740993'),'90071992.54740993')
 for(const value of ['0','-1','NaN','Infinity','1e8','0.000000001','1abc',1,null]) assert.throws(()=>toThorBaseUnits(value))
})
test('quote read fails over on 503 and preserves parameters',async()=>{
 const seen:string[]=[]
 const send:typeof fetch=async(input,options)=>{seen.push(String(input));assert.equal(options?.redirect,'error');return seen.length===1?new Response('',{status:503}):Response.json(quote())}
 const result=await fetchThorQuote(new URLSearchParams({amount:'1'}),['https://primary.example','https://backup.example'],send)
 assert.equal(result.expected_amount_out,'9007199254740993');assert.equal(seen.length,2);assert.ok(seen.every(x=>x.endsWith('?amount=1')))
})
test('expired or malformed successful response tries backup',async()=>{
 let calls=0
 const result=await fetchThorQuote(new URLSearchParams(),['https://primary.example','https://backup.example'],async()=>Response.json(++calls===1?{...quote(),expiry:1}:quote()))
 assert.equal(calls,2);assert.ok(result.memo)
})
test('protocol rejection is not treated as provider outage',async()=>{
 let calls=0
 const result=await fetchThorQuote(new URLSearchParams(),['https://primary.example','https://backup.example'],async()=>{calls++;return Response.json({error:'chain halted'})})
 assert.equal(result.error,'chain halted');assert.equal(calls,1)
})
test('all providers unavailable produces a clear failure',async()=>{
 await assert.rejects(fetchThorQuote(new URLSearchParams(),['https://primary.example'],async()=>{throw Error('timeout')}),/unavailable/)
})
test('operator URLs reject credentials and plaintext',()=>{
 assert.throws(()=>quoteEndpoints('http://provider.example'));assert.throws(()=>quoteEndpoints('https://secret@provider.example'))
 assert.deepEqual(quoteEndpoints('https://provider.example,https://provider.example/'),['https://provider.example'])
})
