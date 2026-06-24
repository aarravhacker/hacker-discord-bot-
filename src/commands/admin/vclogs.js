const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vclogs')
    .setDescription('Show temp voice channel activity logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp();

    const logs = await db('vc_logs')
      .where({ guild_id: guildId })
      .orderBy('created_at', 'desc')
      .limit(15);

    if (logs.length === 0) {
      embed.setDescription('No voice logs found.').setColor(0xFEE75C);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const description = logs.map(log => {
      const time = `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`;
      return `\`${log.action}\` - <@${log.user_id}> in <#${log.channel_id}> ${time}`;
    }).join('\n');

    embed
      .setTitle('VC Logs')
      .setDescription(description)
      .setFooter({ text: `Showing ${logs.length} most recent logs` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
  adminOnly: true
};
