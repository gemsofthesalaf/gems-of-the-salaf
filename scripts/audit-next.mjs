import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { auditEnv } from './audit-env.mjs'
const mode = process.argv[2] || 'start'
if (!['build','start','dev'].includes(mode)) throw new Error('Choose build, start, or dev')
const child = spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),mode,...(mode==='build'?[]:['--port','3100','--hostname','127.0.0.1'])],{
  env:{...process.env,...auditEnv},stdio:'inherit',windowsHide:true,
})
child.on('exit', code => { process.exitCode=code ?? 1 })
process.on('SIGINT',()=>child.kill()); process.on('SIGTERM',()=>child.kill())
