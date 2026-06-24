const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badges')
    .setDescription('View or manage user badges')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View a user\'s badges')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to check').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('manage')
        .setDescription('Add or remove a badge from a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The target user').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('badge').setDescription('Badge name to add/remove').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['badge'],
  prefix: true,

  async execute(interaction, args) {
    const db = getDB();
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const user = interaction.options.getUser('user') || interaction.user;

      try {
        const badges = await db('badges')
          .where({ guild_id: guildId, user_id: user.id });

        if (badges.length === 0) {
          return interaction.reply({
            embeds: [infoEmbed(`${user.tag} has no badges.`)],
          });
        }

        const list = badges.map(b => `${b.icon || '🏅'} ${b.badge_name}`).join('\n');
        const embed = new EmbedBuilder()
          .setColor('#00ff99')
          .setTitle(`${user.tag}'s Badges`)
          .setDescription(list)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [errorEmbed('Failed to fetch badges.')],
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'manage') {
      const user = interaction.options.getUser('user');
      const badge = interaction.options.getString('badge');

      try {
        const existing = await db('badges')
          .where({ guild_id: guildId, user_id: user.id, badge_name: badge })
          .first();

        if (existing) {
          await db('badges')
            .where({ guild_id: guildId, user_id: user.id, badge_name: badge })
            .del();

          return interaction.reply({
            embeds: [successEmbed(`Removed badge **${badge}** from ${user.tag}.`)],
          });
        } else {
          await db('badges').insert({
            guild_id: guildId,
            user_id: user.id,
            badge_name: badge,
            icon: '🏅',
            created_at: new Date(),
          });

          return interaction.reply({
            embeds: [successEmbed(`Added badge **${badge}** to ${user.tag}.`)],
          });
        }
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [errorEmbed('Failed to manage badge.')],
          ephemeral: true,
        });
      }
    }
  },
};
