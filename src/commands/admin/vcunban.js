const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcunban')
    .setDescription('Unban user from temp voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to unban').setRequired(true)),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;
    const user = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTimestamp();

    const existing = await db('vc_bans').where({ guild_id: guildId, user_id: user.id }).first();
    if (!existing) {
      embed.setDescription(`${user.tag} is not banned from temp voice.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await db('vc_bans').where({ guild_id: guildId, user_id: user.id }).del();

    embed
      .setTitle('VC Unban')
      .setDescription(`Unbanned **${user.tag}** from temp voice channels.`)
      .setThumbnail(user.displayAvatarURL())
      .addFields({ name: 'Unbanned By', value: interaction.user.tag, inline: true });

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
