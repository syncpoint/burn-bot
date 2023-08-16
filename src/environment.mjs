export const verify = subject => {
  return subject.map(e => {
    if (!process.env[e]) return e
  })
  .filter(e => e != undefined)
}