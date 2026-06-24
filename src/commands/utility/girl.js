const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('girl')
    .setDescription('Assign the Girl role to a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to assign the role to (defaults to yourself)').setRequired(false)
    ),
  prefix: {
    name: 'girl',
    description: 'Assign the Girl role to a user',
    args: [{ name: 'user', description: 'The user to assign the role to (defaults to yourself)', type: 'user', required: false }],
  },
  async execute(interaction, args) {
    const member = interaction.member;
    const targetUser = interaction.options?.getUser('user') || (args?.user ? interaction.guild.members.cache.get(args.user.replace(/[<@!>]/g, ''))?.user : null);
    const targetMember = targetUser ? await interaction.guild.members.fetch(targetUser.id) : member;

    const role = interaction.guild.roles.cache.find(r => r.name === 'Girl');
    if (!role) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('The "Girl" role does not exist in this server.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (targetMember.roles.cache.has(role.id)) {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription(`${targetMember} already has the Girl role.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await targetMember.roles.add(role);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`Assigned the Girl role to ${targetMember}.`);
    return interaction.reply({ embeds: [embed] });
  },
};
