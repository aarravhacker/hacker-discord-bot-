const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Broadcast a message to all servers')
    .addStringOption(opt => opt.setName('message').setDescription('Message to broadcast').setRequired(true)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    const message = isSlash ? interaction.options?.getString('message') : args.join(' ');
    if (!message) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a message to broadcast.')] });
    }

    await interaction.reply({ embeds: [successEmbed('Broadcasting message...')] });

    const embed = new EmbedBuilder()
      .setColor(config.embedColors.info || '#3498DB')
      .setTitle('Broadcast')
      .setDescription(message)
      .setFooter({ text: `From ${user.tag}` })
      .setTimestamp();

    let sent = 0;
    let failed = 0;

    for (const guild of interaction.client.guilds.cache.values()) {
      try {
        const systemChannel = guild.systemChannel;
        if (systemChannel) {
          await systemChannel.send({ embeds: [embed] });
          sent++;
        } else {
          const channels = guild.channels.cache.filter(c => c.type === 0);
          if (channels.size > 0) {
            await channels.first().send({ embeds: [embed] });
            sent++;
          } else {
            failed++;
          }
        }
      } catch {
        failed++;
      }
    }

    const resultMsg = { embeds: [successEmbed(`Broadcast complete! Sent to **${sent}** server(s), failed: **${failed}**`)] };
    if (isSlash) {
      await interaction.followUp(resultMsg);
    } else {
      await interaction.channel.send(resultMsg);
    }
  }
};
