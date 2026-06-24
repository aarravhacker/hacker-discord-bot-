const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Sets a reminder')
    .addStringOption(opt => opt.setName('time').setDescription('Time from now (e.g., 10m, 1h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true)),
  cooldown: 5,
  aliases: ['remindme', 'reminder'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;

    let timeStr, message;
    if (isSlash) {
      timeStr = interaction.options?.getString('time');
      message = interaction.options?.getString('message');
    } else {
      if (!args || args.length < 2) {
        return interaction.reply({ embeds: [errorEmbed('Usage: `/remind <time> <message>`\nExamples: `10m Buy groceries`, `1h Meeting`, `1d Pay rent`')] });
      }
      timeStr = args[0];
      message = args.slice(1).join(' ');
    }

    if (!timeStr || !message) {
      return interaction.reply({ embeds: [errorEmbed('Usage: `/remind <time> <message>`\nExamples: `10m Buy groceries`, `1h Meeting`, `1d Pay rent`')] });
    }

    const match = timeStr.match(/^(\d+)(s|m|h|d|w)$/);
    if (!match) {
      return interaction.reply({ embeds: [errorEmbed('Invalid time format. Use: `10s`, `30m`, `2h`, `1d`, `1w`')] });
    }

    const amount = parseInt(match[1]);
    const unit = match[2];
    const offsets = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    const ms = amount * offsets[unit];
    const unitNames = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days', w: 'weeks' };

    const remindAt = Date.now() + ms;

    if (!interaction.client.reminders) interaction.client.reminders = [];
    interaction.client.reminders.push({
      userId: user.id,
      channelId: interaction.channel.id,
      guildId: interaction.guild?.id,
      message: message,
      remindAt: remindAt
    });

    setTimeout(async () => {
      try {
        const channel = await interaction.client.channels.fetch(interaction.channel.id);
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle('Reminder!')
            .setColor(config.embedColors.warning)
            .setDescription(`**${message}**`)
            .addFields({ name: 'Requested by', value: `<@${user.id}>`, inline: true })
            .setTimestamp();
          channel.send({ content: `<@${user.id}>`, embeds: [embed] });
        }
      } catch (e) {}
      interaction.client.reminders = interaction.client.reminders.filter(r => r.remindAt !== remindAt);
    }, ms);

    const embed = new EmbedBuilder()
      .setTitle('Reminder Set!')
      .setColor(config.embedColors.success)
      .addFields(
        { name: 'Message', value: message.substring(0, 1024), inline: false },
        { name: 'Remind In', value: `${amount} ${unitNames[unit]}`, inline: true },
        { name: 'Remind At', value: `<t:${Math.floor(remindAt / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
