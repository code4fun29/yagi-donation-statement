import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'

const dataFolder = './data'
const amountAndDetailRegex = /^(\d{1,3}(?:\.\d{3})*)(.*)$/ // (2.222 | 1.000.000) + any text
const isDateLine = (line) => line.match(/^(0[1-9]|10)\/09\/2024$/) // [01-10]/09/2024
const isPageLine = (line) => line.match(/Page \d+ of \d+$/) // Page 1 of 12028

let dataBuffer = fs.readFileSync(`${dataFolder}/account_statement.pdf`)
pdf(dataBuffer)
  .then((data) => {
    const text = data.text
    const lines = text.split('\n').filter((line) => line?.length > 0)
    const transactions = []

    let i = 0
    let currentPage = 1
    while (i < lines.length) {
      const line = lines[i]
      if (isPageLine(line)) currentPage++
      if (isDateLine(line)) {
        const date = line.trim()
        i++
        let ct_num = lines[i].trim()
        i++
        const amount_and_detail = amountAndDetailRegex.exec(lines[i].trim())
        const amount = amount_and_detail[1] // skip first element because it's the full match

        let detail = amount_and_detail[2] || ''
        while (true) {
          i++
          if (i >= lines.length) break
          if (isPageLine(lines[i])) break
          if (isDateLine(lines[i])) break
          detail += lines[i] + ' '
        }

        detail.trim() // remove trailing spaces
        transactions.push({ date, ct_num, amount, detail, page: currentPage })
      } else {
        i++
      }
    }

    fs.writeFileSync(`${dataFolder}/data.json`, JSON.stringify(transactions, null, 2))
    const csv = transactions
      .map((t) => `${t.date},${t.ct_num},${t.amount},${t.detail.replace(/,/g, ' ')},${t.page}`)
      .join('\n')
    fs.writeFileSync(`${dataFolder}/data.csv`, 'date,ct_num,amount,detail,page\n' + csv)

    writeJsonData(transactions, 10)
  })
  .catch((error) => {
    console.log(error)
  })

const writeJsonData = (data, chunks = 1) => {
  const chunkSize = Math.ceil(data.length / chunks)
  for (let i = 0; i < chunks; i++) {
    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize)
    fs.writeFileSync(`${dataFolder}/data-${i + 1}.json`, JSON.stringify(chunk, null, 2))
  }
}

const writeCSVData = (data, chunks = 1) => {
  const chunkSize = Math.ceil(data.length / chunks)
  for (let i = 0; i < chunks; i++) {
    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize)
    const csv = chunk
      .map((t) => `${t.date},${t.ct_num},${t.amount},${t.detail.replace(/,/g, ' ')},${t.page}`)
      .join('\n')
    fs.writeFileSync(`${dataFolder}/data-${i}.csv`, 'date,ct_num,amount,detail,page\n' + csv)
  }
}
