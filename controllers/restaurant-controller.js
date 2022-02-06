const { Restaurant, Category } = require('../models')
const restController = {
  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      raw: true,
      nest: true,
      include: Category
    }).then(restaurant => {
      if (!restaurant) throw new Error('Restaurant did not exist!')
      res.render('dashboard', { restaurant })
    })
      .catch(err => next(err))
  },
  getRestaurants: (req, res) => {
    const categoryId = Number(req.query.categoryId) || ''
    return Promise.all([
      Restaurant.findAll({
        include: Category,
        nest: true,
        raw: true,
        where: {
          ...categoryId ? { categoryId } : {}
        }
      }),
      Category.findAll({ raw: true })
    ])
      .then(([restaurants, categories]) => {
        const data = restaurants.map(r => ({
          ...r, description: r.description.substring(0, 50)
        }))
        return res.render('restaurants', {
          restaurants: data,
          categories,
          categoryId
        })
      })
  },
  getRestaurant: (req, res, next) => {
    Restaurant.findByPk(req.params.id, {
      include: Category
    }).then(restaurant => {
      const viewCounts = restaurant.viewCounts
      if (!restaurant) throw new Error('Restaurant did not exist!')
      return restaurant.update({ viewCounts: viewCounts + 1 })
    }).then(restaurant => res.render('restaurant', { restaurant: restaurant.toJSON() }))
      .catch(err => next(err))
  }
}
module.exports = restController
