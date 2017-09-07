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
 
let urlId = 1;

//创建表
pool.query("CREATE TABLE IF NOT EXISTS bookList (id int(11) AUTO_INCREMENT PRIMARY KEY,bookId char(50),bookName char(255),author char(255),images char(255),ratings int(11),wordcount int(11),type char(255),intro text,serialize char(255),likes char(255))", function(err,result){
    if(err){throw err}else{
    	console.log("创建表成功")
    }
})

//判断是否完结
function booktype(str) {
	if (str.indexOf('连载') !== -1) {
		return '连载'
	} else if (str.indexOf('完结') !== -1) {
		return '完本'
	}
}

//将Unicode转汉字
function reconvert(str) {
	str = str.replace(/(&#x)(\w{1,4});/gi, function ($0) {
		return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, "$2"), 16));
	});
	return str
}

function getList(url,callback,urlId){
	superagent.get(url)
	.charset('gbk')  //目标网站编码为gbk
	.end(function(err,res){
		let $ = cheerio.load(res.text)
      	let author = $('#info p').first().text().substr($('#info p').first().text().indexOf('：') + 1)
		let like = []
		for(let i = 0; i < 3; i++){
        	like.push(Math.round(Math.random() * (150 - 1) + 1))
		}
		let intro = ''
		$('#intro p').each(function (i, ele) {
			intro += '-' + $(ele).text().trim()
		})
		let obj = {
			bookId: urlId,
			bookName: $('#info h1').text(),
			author: author,
			images: $('#fmimg img').attr('src'),
			ratings: parseFloat(Math.random() * 2 + 3).toFixed(1), //随机评分
			wordcount: (Math.random() * 30000 + 10000).toFixed(2),  //随机字数
			type: $('.con_top a').eq(1).text().substr(0, 2),  //书籍类型
			intro: $('#intro p').first().text().trim(),  //书记介绍
			serialize: booktype($('#info p').eq(1).text()), //连载还是完结
			likes: like.join('-')  //随机生成相似推荐
		}
		callback(null,obj)
	})
}

function addMysql(results){
	results.some(function(result,index){
		pool.query('insert into booklist set ?',result,function(err,result1){
			if (err) throw err
			if(urlList.length == index+1){
    			console.log('抓取完成！！！！！')
    		    return true
    		}
		})
	})
}

function main(url){
	async.mapLimit(url, 5, function (url, callback) {
		getList(url, callback, urlId)
		urlId++
	}, function (err, results) {
		addMysql(results)
	})
}

main(urlList)
