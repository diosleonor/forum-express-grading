'use strict'
const faker = require('faker')
module.exports = {
  async up (queryInterface, Sequelize) {
    const restaurants = await queryInterface.sequelize.query(
      'SELECT id FROM Restaurants;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM Users;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    await queryInterface.bulkInsert('Comments',
      Array.from({ length: 50 }, () => ({
        text: faker.lorem.sentence(5),
        user_id: users[Math.floor(Math.random() * users.length)].id,
        restaurant_id: restaurants[Math.floor(Math.random() * restaurants.length)].id,
        created_at: new Date(),
        updated_at: new Date()
      }))
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Comments', null, {})
  }
}
