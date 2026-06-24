const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rguest')
    .setDescription('Remove the Guest role from a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to remove the role from (defaults to yourself)').setRequired(false)
    ),
  prefix: {
    name: 'rguest',
    description: 'Remove the Guest role from a user',
    args: [{ name: 'user', description: 'The user to remove the role from (defaults to yourself)', type: 'user', required: false }],
  },
  async execute(interaction, args) {
    const member = interaction.member;
    const targetUser = interaction.options?.getUser('user') || (args?.user ? interaction.guild.members.cache.get(args.user.replace(/[<@!>]/g, ''))?.user : null);
    const targetMember = targetUser ? await interaction.guild.members.fetch(targetUser.id) : member;

    const role = interaction.guild.roles.cache.find(r => r.name === 'Guest');
    if (!role) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('The "Guest" role does not exist in this server.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!targetMember.roles.cache.has(role.id)) {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription(`${targetMember} does not have the Guest role.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await targetMember.roles.remove(role);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`Removed the Guest role from ${targetMember}.`);
    return interaction.reply({ embeds: [embed] });
  },
};
