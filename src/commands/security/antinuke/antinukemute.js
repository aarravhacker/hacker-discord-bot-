const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukemute')
    .setDescription('Mute a user detected by antinuke')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to mute').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(40320)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Mute reason')
    ),
  cooldown: 5,
  aliases: ['anmute'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let targetUser;
      let duration = 10;
      let reason = 'Antinuke violation';

      if (isSlash) {
        targetUser = interaction.options?.getUser('user');
        duration = interaction.options?.getInteger('duration') || duration;
        reason = interaction.options?.getString('reason') || reason;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please mention a user to mute.')] });
        }
        const userId = args[0].replace(/[<@!>]/g, '');
        targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        duration = parseInt(args[1]) || duration;
        reason = args.slice(2).join(' ') || reason;
        if (!targetUser) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'User not found.')] });
        }
      }

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'User is not in this server.')] });
      }

      if (!member.moderatable) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot mute this user. They may have a higher role.')] });
      }

      let muteRole = guild.roles.cache.find(r => r.name === 'Muted');
      if (!muteRole) {
        muteRole = await guild.roles.create({
          name: 'Muted',
          permissions: [],
          reason: 'Created for antinuke muting'
        });
        guild.channels.cache.forEach(async (channel) => {
          await channel.permissionOverwrites.edit(muteRole, { SendMessages: false, Speak: false });
        });
      }

      await member.roles.add(muteRole, `${reason} | Muted by ${moderator.tag} via antinuke`);

      setTimeout(async () => {
        if (member.roles.cache.has(muteRole.id)) {
          await member.roles.remove(muteRole, 'Mute duration expired');
        }
      }, duration * 60 * 1000);

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'antinuke_mute',
        type: 'antinuke',
        details: JSON.stringify({ target: targetUser.id, reason, duration })
      });

      const embed = successEmbed('Antinuke Mute', `🔇 **${targetUser.tag}** has been muted for ${duration} minutes.\n**Reason:** ${reason}`);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to mute user.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
