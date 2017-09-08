const cheerio = require('cheerio')
const superagent = require('superagent')
require('superagent-charset')(superagent)
const async = require('async')
const mysql = require('mysql')

const urlList = require('./urlList')

//链接数据池
const pool = mysql.createPool({
	host: 'localhost',
	user: 'root',
	password: '123456',
	database: 'book',
	port: 3306
})

let num = 1 //从第几本书开始


let urlId = num //第几本书
let url = urlList[urlId - 1] //爬取当前书的url地址
let chapterAll = 0 //总章节数
let id = 0 //计数器
let chapters = 10 //要爬取的章节数

//创建表
pool.query("CREATE TABLE IF NOT EXISTS books (id int AUTO_INCREMENT PRIMARY KEY,bookId int,chapterId int,bookName char(50),title char(50),content text)", function(err,result){
    if(err){throw err}else{
    	console.log("创建表成功")
    }
})

//去除空格和&nbsp;转义字符
function trim(str) {
  return str.replace(/(^\s*)|(\s*$)/g, '').replace(/&nbsp;/g, '')
}

//将Unicode转汉字
function reconvert(str) {
	str = str.replace(/(&#x)(\w{1,4});/gi, function ($0) {
		return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, "$2"), 16));
	});
	return str
}

function getUrl(url,callback,id){
	superagent.get(url)
	.charset('gbk')  //目标网站编码为gbk
	.end(function(err,res){
		let $ = cheerio.load(res.text)
		let arr = []
		let content = reconvert($("#content").html())
		let contentArr = content.split('<br><br>')
		contentArr.forEach(function(ele){
			let data = trim(ele.toString())
			arr.push(data)
		})
		let obj = {
			bookId: urlId,
			chapterId: id,
			bookName: $('.footer_cont a').text(),
			title: $('.bookname h1').text(),
			content: arr.join('-').slice(0, 20000)
		}
		callback(null,obj)
	})
}

function addMysql(results){
	results.some(function(result,index){
		pool.query('insert into books set ?',result,function(err,result1){
			if (err) throw err
			if(result.chapterId == results.length){
				console.log(`第${urlId}本书完成`)
				urlId++
        		url = urlList[urlId - 1]
        		id = 0
        		if(urlList.length < urlId){
        			console.log('抓取完成！！！！！')
        		    return true
        		}
        		main(url)
			}

		})
	})
}

function main(url){
	superagent.get(url)
	.charset('gbk')
	.end(function(err,res){
		var $ = cheerio.load(res.text)
		let urls = []
		chapterAll = $('#list dd').length
		$('#list dd').each(function(i,ele){
			if(i < chapters){
				urls.push('http://www.zwdu.com' + $(ele).find('a').attr('href'))
			}
		})
		async.mapLimit(urls,5,function(url,callback){
			id++
			getUrl(url,callback,id)
		},function(err,results){
			addMysql(results)
		})
	})
}

 main(url)