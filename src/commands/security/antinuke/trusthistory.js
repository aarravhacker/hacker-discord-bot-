const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trusthistory')
    .setDescription('View trust change history for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to check history for').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Number of entries (1-25)').setMinValue(1).setMaxValue(25)
    ),
  cooldown: 5,
  aliases: ['trusthist', 'trhistory'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    let targetUser;
    if (isSlash) {
      targetUser = interaction.options.getUser('user');
    } else {
      const userId = (args[0] || '').replace(/[<@!>]/g, '');
      targetUser = userId ? await guild.members.fetch(userId).then(m => m.user).catch(() => null) : null;
    }

    const limit = isSlash ? (interaction.options.getInteger('limit') || 10) : parseInt(args[1]) || 10;

    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid User')
        .setDescription('Please specify a valid user.')
        .setColor(0xff0000)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const incidents = securityEngine.getIncidents(guild.id, 200);
      const trustChanges = incidents.filter(i =>
        i.userId === targetUser.id && i.type === 'trust_modified'
      ).slice(0, limit);

      const trustLevel = securityEngine.getTrustLevel(guild.id, targetUser.id);
      const risk = securityEngine.calculateRisk(guild.id, targetUser.id);
      const profile = securityEngine.getProfile(guild.id, targetUser.id);

      const embed = new EmbedBuilder()
        .setTitle(`📋 Trust History: ${targetUser.tag}`)
        .setDescription(`Trust change history for **${targetUser.tag}**.`)
        .setColor(0x5865f2)
        .setTimestamp()
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'Current Trust Score', value: `**${trustLevel.score}**/100`, inline: true },
          { name: 'Trust Level', value: `**${trustLevel.level}** - ${trustLevel.label}`, inline: true },
          { name: 'Risk Score', value: `**${risk}**/100`, inline: true }
        );

      if (trustChanges.length > 0) {
        const historyList = trustChanges.map((inc, i) => {
          const amount = inc.details.amount || 0;
          const emoji = amount > 0 ? '📈' : '📉';
          const color = amount > 0 ? '+' : '';
          return `${emoji} **${color}${amount}** — ${inc.details.reason || 'No reason'}\n> <t:${Math.floor(inc.timestamp / 1000)}:R>`;
        }).join('\n\n');
        embed.addFields({ name: '📜 Trust Changes', value: historyList, inline: false });
      } else {
        embed.addFields({ name: '📜 Trust Changes', value: 'No trust changes recorded for this user.', inline: false });
      }

      embed.addFields({
        name: '📊 Activity Summary',
        value: `💬 Messages: **${profile.messageCount}**\n✏️ Edits: **${profile.editCount}**\n🗑️ Deletes: **${profile.deleteCount}**\n👀 Last Seen: <t:${Math.floor(profile.lastSeen / 1000)}:R>`,
        inline: false
      });

      if (trustLevel.isFlagged) {
        embed.addFields({
          name: '⚠️ Flagged',
          value: `This user is flagged for: **${trustLevel.flagReason}**`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load trust history.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
