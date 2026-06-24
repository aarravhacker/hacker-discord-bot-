const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows information about a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to get info about').setRequired(false)),
  cooldown: 5,
  aliases: ['ui', 'whois'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const client = interaction.client;

      let target;
      if (isSlash) {
        target = interaction.options?.getUser('user') || interaction.user;
      } else {
        const userId = args?.[0]?.replace(/[<>@!]/g, '') || interaction.author?.id;
        target = await client.users.fetch(userId).catch(() => interaction.author);
      }

      const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;

      const embed = new EmbedBuilder()
        .setTitle(target.tag)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setColor(config.embedColors.info)
        .addFields(
          { name: 'ID', value: target.id, inline: true },
          { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
          { name: 'Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true }
        );

      if (member) {
        embed.addFields(
          { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: 'Nickname', value: member.nickname || 'None', inline: true },
          { name: 'Roles', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'None', inline: false }
        );
      }

      embed.setTimestamp();
      interaction.reply({ embeds: [embed] });
    } catch (err) {
      interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] }).catch(() => {});
    }
  }
};
