import { createClient } from './src/lib/supabase/server'

async function test() {
  const supabase = await createClient()
  const res = await supabase.from('quotes').select('*')
  console.log(res)
}
test()
