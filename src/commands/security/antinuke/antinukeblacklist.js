const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeblacklist')
    .setDescription('Blacklist users from antinuke protection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('add').setDescription('Blacklist a user')
      .addUserOption(opt => opt.setName('user').setDescription('User to blacklist').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for blacklisting')))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove user from blacklist')
      .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List blacklisted users')),

  cooldown: 5,
  aliases: ['anblacklist', 'ablacklist'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'list');
    const validSubs = ['add', 'remove', 'list'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'add') {
        const targetUser = isSlash ? interaction.options.getUser('user') : interaction.guild.members.cache.get(args[1]?.replace(/[<@!>]/g, ''));
        const reason = isSlash ? (interaction.options.getString('reason') || 'No reason provided') : (args.slice(2).join(' ') || 'No reason provided');
        if (!targetUser) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing User')
            .setDescription('Please specify a user to blacklist.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.blacklistUser(interaction.guild.id, targetUser.id, reason);
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚫 User Blacklisted')
          .setDescription(`${targetUser.tag || targetUser.username} has been blacklisted from antinuke protection.`)
          .addFields(
            { name: 'User', value: `${targetUser.tag || targetUser.username}`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Blacklisted By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'remove') {
        const targetUser = isSlash ? interaction.options.getUser('user') : interaction.guild.members.cache.get(args[1]?.replace(/[<@!>]/g, ''));
        if (!targetUser) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing User')
            .setDescription('Please specify a user to remove from blacklist.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.unblacklistUser(interaction.guild.id, targetUser.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ User Removed from Blacklist')
          .setDescription(`${targetUser.tag || targetUser.username} has been removed from the blacklist.`)
          .addFields(
            { name: 'User', value: `${targetUser.tag || targetUser.username}`, inline: true },
            { name: 'Removed By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const blacklisted = await securityEngine.getBlacklist(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚫 Blacklisted Users')
          .setDescription('Users blacklisted from antinuke protection.')
          .setTimestamp();

        if (blacklisted?.length) {
          const list = blacklisted.map(b => `**${b.username || b.tag}** - ${b.reason || 'No reason'} (by ${b.blacklistedBy})`).join('\n');
          embed.addFields({ name: 'Blacklisted Users', value: list });
        } else {
          embed.addFields({ name: 'Blacklisted Users', value: 'No users are currently blacklisted.' });
        }

        embed.addFields({ name: 'Total', value: String(blacklisted?.length || 0), inline: true });
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Blacklist operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
