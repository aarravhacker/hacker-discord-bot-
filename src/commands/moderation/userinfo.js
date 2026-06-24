const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const { getModLogsByUser } = require('../../db/modRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option => option.setName('user').setDescription('The user to get info about'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  aliases: ['ui', 'whois'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));

    try {
      const user = target.user;
      const member = target;

      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .join(', ') || 'None';

      const logs = await getModLogsByUser(interaction.guild.id, user.id, 5);
      const warnCount = logs.filter(l => l.action === 'warn').length;

      const embed = infoEmbed(`**User Info - ${user.tag}**`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addField('ID', user.id, true)
        .addField('Username', user.username, true)
        .addField('Nickname', member.nickname || 'None', true)
        .addField('Account Created', `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, true)
        .addField('Joined Server', `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, true)
        .addField('Roles', roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles)
        .addField('Warnings', warnCount.toString(), true)
        .addField('Highest Role', member.roles.highest.toString(), true)
        .addField('Bot?', user.bot ? 'Yes' : 'No', true);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching user info.')] });
    }
  }
};
