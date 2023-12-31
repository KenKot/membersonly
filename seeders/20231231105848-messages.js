"use strict";
const {query} = require("express");
const models = require("../models");
const Message = models.Message;
const User = models.User;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const messages = [];
    const users = await User.findAll();

    users.forEach((user, i) => {
      messages.push({
        userId: user.id,
        title: `Message # ${i}`,
        text: `In publishing and graphic design, Lorem ipsum is a placeholder text commonly used to demonstrate the visual form of a document or a typeface without relying on meaningful content. Lorem ipsum may be used as a placeholder before final copy is available  `,
      });
    });

    return queryInterface.bulkInsert("Messages", messages);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */

    return queryInterface.bulkDelete("Messages", null, {}, models.Message);
  },
};
