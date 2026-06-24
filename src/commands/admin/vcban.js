const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcban')
    .setDescription('Ban user from creating/joining temp voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to ban from temp voice').setRequired(true)),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const user = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTimestamp();

    const existing = await db('vc_bans').where({ guild_id: guildId, user_id: user.id }).first();
    if (existing) {
      embed.setDescription(`${user.tag} is already banned from temp voice.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await db('vc_bans').insert({
      guild_id: guildId,
      user_id: user.id,
      banned_by: interaction.user.id,
      created_at: new Date()
    });

    // Kick from current temp channel if in one
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member?.voice?.channel) {
      const tempChannel = await db('temp_channels').where({ guild_id: guildId, channel_id: member.voice.channelId }).first();
      if (tempChannel) {
        await member.voice.disconnect('Temp voice ban');
      }
    }

    embed
      .setTitle('VC Ban')
      .setDescription(`Banned ${user.tag} from temp voice channels.`)
      .setThumbnail(user.displayAvatarURL())
      .addFields({ name: 'Banned By', value: interaction.user.tag, inline: true });

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
