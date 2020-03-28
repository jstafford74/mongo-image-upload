const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');


const app = express();
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');


// MongoDB //
const MongoURI = 'mongodb://localhost:27017/fileUploader'

const conn = mongoose.createConnection(MongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});

//  init gfs //
let gfs

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');

})

// create storage object //

var storage = new GridFsStorage({
    url: MongoURI,
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
    },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });
//make post route and then use upload variable so it uploads to db//


//@route GET ?
//@desc Loads form


app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Files exist?
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    file.isImage = true;

                } else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files })
        }

    })
})

//@route POST /upload
// @desc Uploads file to DB

app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ file: req.file })
    res.redirect('/');
})

// @route Get /files
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Files exist?
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No Files exist'
            })
        }
        return res.json(files);
    })
})

app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No File exists'
            })
        }
        return res.json(file);
    })

})

//@route Get /image/:filename
//@desc get single image and display

app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No File exists'
            })
        }
        if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
            //read output to browser
            let readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            })
        }

    })

})

app.delete('files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'fileUploader' }, (err, gridStore) => {
        if (err) {
            return (res.status(404).json({ err: err }))
        }
        res.redirect('/')
    });
})
const port = 5000;

app.listen(port, () => { console.group(`Server started on port ${port}`) })
