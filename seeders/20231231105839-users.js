"use strict";

const models = require("../models");
const User = models.User;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const users = [];
    for (let i = 1; i < 4; i++) {
      users.push({
        firstName: `Bob${i}`,
        lastName: `Smith${i}`,
        email: `Bob${i}@gmail.com`,
        password: `Bob${i}@gmail.com`,
      });
    }

    return queryInterface.bulkInsert("Users", users);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete("Users", null, {}, models.User);
  },
};
