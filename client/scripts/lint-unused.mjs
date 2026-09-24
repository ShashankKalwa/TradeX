// Dev utility: report imported identifiers that are never referenced again.
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx?|mjs)$/.test(f)) out.push(p)
  }
  return out
}

const WORD = '[^A-Za-z0-9_$]'

for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  const names = new Map()

  lines.forEach((l, i) => {
    const m = l.match(/^import\s+(.+?)\s+from\s+['"](.+?)['"]/)
    if (!m) return
    const clause = m[1]
    const specs = []
    const def = clause.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/)
    if (def) specs.push(def[1])
    const braced = clause.match(/{([^}]*)}/)
    if (braced) {
      for (const part of braced[1].split(',')) {
        const n = part.trim().split(/\s+as\s+/).pop().trim()
        if (n) specs.push(n)
      }
    }
    for (const s of specs) names.set(s, i + 1)
  })

  const unused = []
  for (const [name, line] of names) {
    const body = lines.filter((_, i) => i !== line - 1).join('\n')
    if (body.indexOf(name) === -1) {
      unused.push(name + ' (line ' + line + ')')
      continue
    }
    const re = new RegExp(WORD + name.replace(/\$/g, '[$]') + WORD)
    if (!re.test(body)) unused.push(name + ' (line ' + line + ')')
  }
  if (unused.length) console.log(file + ': ' + unused.join(', '))
}
