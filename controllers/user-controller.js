const bcrypt = require('bcryptjs')
const db = require('../models')
const { User } = db
const { imgurFileHandler } = require('../helpers/file-helpers')
const { Restaurant, Comment, Favorite, Like, Followship } = require('../models')
const auth = require('../helpers/auth-helpers')
const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')
    User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) throw new Error('Email already exists!')
        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(() => {
        req.flash('success_messages', 'Account successfully created.')
        res.redirect('signin')
      })
      .catch(err => next(err))
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res, next) => {
    return User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (!user) throw new Error('Impossibe!')
        return user.update({ loggedIn: 1 })
      })
      .then(user => {
        req.flash('success_messages', 'Login successfully.')
        res.redirect('/restaurants')
      })
      .catch(err => next(err))
  },
  logout: (req, res, next) => {
    return User.findByPk(req.user.id)
      .then(user => {
        if (!user) throw new Error('Impossibe!')
        return user.update({ loggedIn: 0 })
      })
      .then(user => {
        req.flash('success_messages', 'Logout successfully.')
        req.logout()
        res.redirect('/signin')
      })
      .catch(err => next(err))
  },
  getUser: (req, res, next) => {
    const paramsId = parseInt(req.params.id)
    const userId = auth.getUser(req).id
    return Promise.all([
      User.findByPk(paramsId, {
        include: { model: Comment, include: Restaurant }
      }),
      User.findByPk(userId, {
        include: { model: Comment, include: Restaurant }
      })
    ])
      .then(([guest, host]) => {
        if (!guest) throw new Error('User did not exist!')
        let commentCounts = ''
        if (guest.Comments) commentCounts = guest.Comments.length
        res.render('users/profile', { user: guest.toJSON(), loggedInUser: host.toJSON(), commentCounts })
      })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    const paramsId = parseInt(req.params.id)
    const userId = auth.getUser(req).id
    return User.findByPk(paramsId)
      .then(user => {
        if (!user) throw new Error('User did not exist!')
        if (userId !== user.id) throw new Error('Can not access!')
        res.render('users/edit', { user: user.toJSON() })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    const { name } = req.body
    const { file } = req
    const userId = req.user.id
    const paramsId = parseInt(req.params.id)
    if (userId !== paramsId) throw new Error('This is not your profile, you are not allowed to edit.')
    if (!name) throw new Error('User name is required!')
    return Promise.all([
      User.findByPk(req.params.id),
      imgurFileHandler(file)
    ])
      .then(([user, filePath]) => {
        if (!user) throw new Error('User did not exist!')
        return user.update({ name, image: filePath || user.image })
      })
      .then(() => {
        req.flash('success_messages', '使用者資料編輯成功')
        res.redirect(`/users/${userId}`)
      })
      .catch(err => next(err))
  },
  addFavorite: (req, res, next) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error('Restaurant did not exist!')
        if (favorite) throw new Error('The restaurant is already your favorite!')
        return Favorite.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFavorite: (req, res, next) => {
    return Favorite.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(favorite => {
        if (!favorite) throw new Error('This restaurant is not your favorite.')
        return favorite.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  addLike: (req, res, next) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, like]) => {
        if (!restaurant) throw new Error('Restaurant did not exist!')
        if (like) throw new Error('You have liked this restaurant!')
        return Like.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
    return Like.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(like => {
        if (!like) throw new Error('You have not liked this restaurant!')
        return like.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  getTopUsers: (req, res, next) => {
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        const result = users.map(user => ({
          ...user.toJSON(),
          followerCount: user.Followers.length,
          isFollowed: req.user.Followings.some(f => f.id === user.id)
        })).sort((a, b) => b.followerCount - a.followerCount)
        res.render('top-users', { users: result })
      })
      .catch(err => next(err))
  },
  addFollowing: (req, res, next) => {
    const { userId } = req.params
    return Promise.all([
      User.findByPk(userId),
      Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })
    ])
      .then(([user, followship]) => {
        if (!user) throw new Error('User did not exist!')
        if (followship) throw new Error('You have followed this user!')
        return Followship.create({
          followerId: req.user.id,
          followingId: userId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFollowing: (req, res, next) => {
    return Followship.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    })
      .then(Followship => {
        if (!Followship) throw new Error('You have not followed this user!')
        return Followship.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }
}
module.exports = userController
