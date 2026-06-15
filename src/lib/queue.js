const { queue } = require('bullmq');

const queue = new Queue('yuki-queue', {
    connection: {
        url: process.env.REDIS_URL
    },
});

module.exports = queue;