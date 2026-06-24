const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trust')
    .setDescription('Manage user trust levels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('check')
        .setDescription('Check a user\'s trust level')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to check').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('grant')
        .setDescription('Increase trust for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to grant trust to').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Amount of trust to grant (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for granting trust').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('revoke')
        .setDescription('Decrease trust for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to revoke trust from').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Amount of trust to revoke (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for revoking trust').setRequired(true)
        )
    ),
  cooldown: 5,
  aliases: ['trustlevel', 'tr'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    let subcommand, targetUser, amount, reason;

    if (isSlash) {
      subcommand = interaction.options.getSubcommand();
      targetUser = interaction.options.getUser('user');
      amount = interaction.options.getInteger('amount');
      reason = interaction.options.getString('reason');
    } else {
      const argsList = interaction.content.split(' ').slice(1);
      subcommand = argsList[0]?.toLowerCase();
      const userId = argsList[1]?.replace(/[<@!>]/g, '');
      targetUser = userId ? await guild.members.fetch(userId).then(m => m.user).catch(() => null) : null;
      amount = parseInt(argsList[2]) || 0;
      reason = argsList.slice(3).join(' ') || 'No reason provided';
    }

    if (!subcommand) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Usage')
        .setDescription('Please specify a subcommand: `check`, `grant`, or `revoke`\n\n**Prefix Usage:**\n`!trust check @user`\n`!trust grant @user <amount> <reason>`\n`!trust revoke @user <amount> <reason>`')
        .setColor(0xff0000)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'check') {
        if (!targetUser) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription('Please specify a valid user.')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const trustLevel = securityEngine.getTrustLevel(guild.id, targetUser.id);
        const risk = securityEngine.calculateRisk(guild.id, targetUser.id);

        let trustColor = 0x00ff00;
        if (trustLevel.level <= 1) trustColor = 0xff0000;
        else if (trustLevel.level <= 2) trustColor = 0xffaa00;
        else if (trustLevel.level <= 3) trustColor = 0xffff00;

        const embed = new EmbedBuilder()
          .setTitle(`🔍 Trust Check: ${targetUser.tag}`)
          .setColor(trustColor)
          .setTimestamp()
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: 'Trust Level', value: `**${trustLevel.level}** - ${trustLevel.label}`, inline: true },
            { name: 'Trust Score', value: `**${trustLevel.score}**/100`, inline: true },
            { name: 'Risk Score', value: `**${risk}**/100`, inline: true },
            { name: 'Is Trusted', value: trustLevel.isTrusted ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Is Flagged', value: trustLevel.isFlagged ? `⚠️ Yes - ${trustLevel.flagReason}` : '✅ No', inline: true }
          );

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'grant') {
        if (!targetUser || !amount || amount <= 0) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription('Please specify a valid user and amount.\n**Prefix Usage:** `!trust grant @user <amount> <reason>`')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const result = securityEngine.modifyTrust(guild.id, targetUser.id, amount, reason);

        const embed = new EmbedBuilder()
          .setTitle('✅ Trust Granted')
          .setDescription(`Successfully granted **${amount}** trust to ${targetUser.tag}`)
          .setColor(0x00ff00)
          .setTimestamp()
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: 'New Trust Score', value: `**${result.score}**/100`, inline: true },
            { name: 'New Trust Level', value: `**${result.level}**`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Granted By', value: `${user.tag}`, inline: true }
          );

        await interaction.reply({ embeds: [embed] });

      } else if (subcommand === 'revoke') {
        if (!targetUser || !amount || amount <= 0) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription('Please specify a valid user and amount.\n**Prefix Usage:** `!trust revoke @user <amount> <reason>`')
            .setColor(0xff0000)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const result = securityEngine.modifyTrust(guild.id, targetUser.id, -amount, reason);

        let revokeColor = 0x00ff00;
        if (result.score <= 20) revokeColor = 0xff0000;
        else if (result.score <= 40) revokeColor = 0xffaa00;
        else if (result.score <= 60) revokeColor = 0xffff00;

        const embed = new EmbedBuilder()
          .setTitle('❌ Trust Revoked')
          .setDescription(`Successfully revoked **${amount}** trust from ${targetUser.tag}`)
          .setColor(revokeColor)
          .setTimestamp()
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: 'New Trust Score', value: `**${result.score}**/100`, inline: true },
            { name: 'New Trust Level', value: `**${result.level}**`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Revoked By', value: `${user.tag}`, inline: true }
          );

        if (result.isFlagged) {
          embed.addFields({ name: '⚠️ User Flagged', value: `This user has been flagged for suspicious activity: ${result.flagReason}`, inline: false });
        }

        await interaction.reply({ embeds: [embed] });

      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Invalid Subcommand')
          .setDescription('Available subcommands: `check`, `grant`, `revoke`')
          .setColor(0xff0000)
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while managing trust.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};