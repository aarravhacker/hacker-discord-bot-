const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('connect')
        .setDescription('Connect to your voice channel'),
    cooldown: 5,
    aliases: ['join', 'j'],
    prefix: true,
    async execute(interaction, args) {
        try {
            const channel = interaction.member.voice.channel;
            if (!channel) {
                return interaction.reply({
                    embeds: [errorEmbed('You must be in a voice channel.')]
                });
            }

            await musicManager.connect(interaction.guild.id, channel.id);
            return interaction.reply({
                embeds: [successEmbed(`Connected to **${channel.name}**.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to connect: ${error.message}`)]
            });
        }
    }
};
