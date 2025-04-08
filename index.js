
import express from 'express'
import jwt from 'jsonwebtoken'
import {prisma} from './prisma/prisma.js'
import { body } from 'express-validator'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())

// ROUTES

//INDEX-REROUTE
app.get('/', async (req, res) => {
    res.redirect('/api')
})

//INDEX
app.get('/api', async (req, res, next) => {
    const users = await prisma.user.findMany()
    const posts = await prisma.post.findMany()
    const comments = await prisma.comment.findMany()

    res.send([
        "USERS:", users, "POSTS:", posts, "COMMENTS:", comments
    ])
})

// ALL USERS -- (not used)
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany()

    res.send(
        users
    )
})

//ONE USER -- (not used)
app.get('/api/users/:id', async (req, res) => {
    const user = await prisma.user.findFirst({
        where: {
            id: Number(req.params.id)
        }
    })

    res.send(
        user
    )
})

//ADD USER
app.post('/api/sign-up', async (req, res) => {
    const {email, username, password, author} = req.body

    const user = await prisma.user.create({
        data: {
            email,
            username,
            password,
            author
        }
    })

    res.send(
        user
    )
})

//SIGN-IN USER
app.post('/api/log-in', async (req, res) => {
    const {username, password} = req.body

    const user = await prisma.user.findFirst({
        where: {
            username,
        }
    })

    if (user) {
        console.log('username verified')
        if( password == user.password) {
            console.log('password verified')
            //both username and password match so create jwt
            jwt.sign({user: user}, 'secretkey', (err, token) => {
                res.json({
                    token
                })
            })
        } else {
            res.send(
                {message: "password is incorrect"}
            )
        }
    } else {
        res.send(
            {message: "username is incorrect"}
        )
    }
})

//SIGN-IN USER (AUTHOR)
app.post('/api/log-in/author', async (req, res) => {
    const {username, password} = req.body

    const user = await prisma.user.findFirst({
        where: {
            username,
            author: {
                equals: true
            }
        }
    })

    if (user) {
        console.log('username verified')
        if( password == user.password) {
            console.log('password verified')
            //both username and password match so create jwt
            jwt.sign({user: user}, 'secretkey', (err, token) => {
                res.json({
                    token
                })
            })
        } else {
            res.send(
                {message: "password is incorrect"}
            )
        }
    } else {
        res.send(
            {message: "username is incorrect"}
        )
    }
})

// BLOG VIEW -- ALL POSTS 
app.get('/api/posts', verifyToken, async (req, res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err) {
             res.sendStatus(403)
         } else {
            let blogposts = await prisma.post.findMany({
                where: {
                    published: true
                }
            })
             res.json({
                 message: 'tokens matched, user verified',
                 authData,
                 blogposts
             })
         }
     })
})

// BLOG VIEW -- ALL COMMENTS 
app.get('/api/comments', verifyToken, async (req, res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err) {
             res.sendStatus(403)
         } else {
            let comments = await prisma.comment.findMany()
             res.json({
                 message: 'tokens matched, user verified',
                 authData,
                 comments
             })
         }
     })
})

// USER DASHBOARD -- ALL USER POSTS
app.get('/api/:author/posts', verifyToken, async (req, res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err) {
             res.sendStatus(403)
         } else {
            let blogposts = await prisma.post.findMany({
                where: {
                    authorName: String(req.params.author)
                }
            })

                res.json({
                    message: 'tokens matched, user verified',
                    authData,
                    blogposts
                })
         }
     })
})



// GET EDIT POST PAGE -- ONE USER POST
app.get('/api/:author/posts/edit/:postID', verifyToken, async (req, res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err) {
             res.sendStatus(403)
         } else {
            let blogpost = await prisma.post.findFirst({
                where: {
                    authorName: req.params.author,
                    id: Number(req.params.postID)
                }
            })
             res.json({
                 message: 'tokens matched, user verified',
                 authData,
                 blogpost
             })
         }
     })
})

//UPDATE POST WITH CHANGES
app.put('/api/:author/posts/edit/:postID', verifyToken, async (req, res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err) {
             res.sendStatus(403)
         } else {
            const {title, body, published} = req.body
            let blogpost = await prisma.post.update({
                where: {
                    authorName: String(req.params.author),
                    id: Number(req.params.postID)
                },
                data: {
                    title: title,
                    body: body,
                    published: published
                }
            })
             res.json({
                 message: 'tokens matched, user verified',
                 authData,
                 blogpost
             })
         }
     })
})

app.get('/api/check-user', verifyToken, async (req, res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err) {
             res.sendStatus(403)
         } else {
             res.json({
                 message: 'tokens matched, user can post',
                 authData
             })
         }
     })
})

app.post('/api/new-post', async (req, res) => {
    const {title, body, author} = req.body

    const newPost = await prisma.post.create({
        data: {
            title,
            body,
            authorName: author
        }
    })

    res.send(
        newPost
    )
})

app.post('/api/new-comment', async (req, res) => {
    const {author, comment, postID} = req.body

    const newComment = await prisma.comment.create({
        data: {
            authorName: author,
            body: comment,
            postId: Number(postID)
        }
    })

    res.send(
        newComment
    )
})


function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization']
    if(typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ')
        const bearerToken = bearer[1]
        req.token = bearerToken
        next()
    } else {
        res.sendStatus(403)
    }
}


app.listen(PORT, () => {
    console.log(`API is listening on port ${PORT}`)
})