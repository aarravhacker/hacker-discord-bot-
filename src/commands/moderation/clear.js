const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages with filters')
    .addSubcommand(sub =>
      sub
        .setName('all')
        .setDescription('Clear all messages')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('bot')
        .setDescription('Clear bot messages')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('contains')
        .setDescription('Clear messages containing text')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Text to search for')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('embeds')
        .setDescription('Clear messages with embeds')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('emoji')
        .setDescription('Clear messages with emoji')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('files')
        .setDescription('Clear messages with files')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('images')
        .setDescription('Clear messages with images')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reactions')
        .setDescription('Clear messages with reactions')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Clear messages from a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user whose messages to clear')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of messages to clear')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  cooldown: 5,
  aliases: ['purge', 'clearmessages'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const channel = interaction.channel;
      const subcommand = interaction.options.getSubcommand();

      let deletedCount = 0;
      let filter = () => true;

      switch (subcommand) {
        case 'all': {
          const count = interaction.options.getInteger('count');
          filter = () => true;
          break;
        }

        case 'bot': {
          const count = interaction.options.getInteger('count');
          filter = msg => msg.author.bot;
          break;
        }

        case 'contains': {
          const text = interaction.options.getString('text');
          filter = msg => msg.content.includes(text);
          break;
        }

        case 'embeds': {
          const count = interaction.options.getInteger('count');
          filter = msg => msg.embeds.length > 0;
          break;
        }

        case 'emoji': {
          const count = interaction.options.getInteger('count');
          const emojiRegex = /<a?:\w+:\d+>|\p{Emoji}/u;
          filter = msg => emojiRegex.test(msg.content);
          break;
        }

        case 'files': {
          const count = interaction.options.getInteger('count');
          filter = msg => msg.attachments.size > 0;
          break;
        }

        case 'images': {
          const count = interaction.options.getInteger('count');
          filter = msg => {
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
            return [...msg.attachments.values()].some(att =>
              imageExtensions.some(ext => att.name.toLowerCase().endsWith(ext))
            ) || msg.embeds.some(e => e.image || e.thumbnail);
          };
          break;
        }

        case 'reactions': {
          const count = interaction.options.getInteger('count');
          filter = msg => msg.reactions.cache.size > 0;
          break;
        }

        case 'user': {
          const user = interaction.options.getUser('user');
          filter = msg => msg.author.id === user.id;
          break;
        }
      }

      const count = interaction.options.getInteger('count') || 100;
      const messages = await channel.messages.fetch({ limit: 100 });
      const filtered = messages.filter(filter).first(count);

      if (filtered.size === 0) {
        return interaction.reply({
          embeds: [infoEmbed('No messages found matching the filter.')],
          ephemeral: true
        });
      }

      const deleted = await channel.bulkDelete(filtered, true);
      deletedCount = deleted.size;

      const embed = successEmbed(`Successfully deleted ${deletedCount} messages.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error in clear command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while clearing messages.')],
        ephemeral: true
      });
    }
  }
};
