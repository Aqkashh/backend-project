

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true ,limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
