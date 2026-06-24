const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../utils/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('switchnode')
        .setDescription('Switch to a different Lavalink node')
        .addStringOption(option =>
            option
                .setName('node')
                .setDescription('Node name to switch to')
                .setRequired(true)
        ),
    cooldown: 10,
    aliases: ['node', 'sn'],
    prefix: true,
    async execute(interaction, args) {
        try {
            let nodeName;
            if (interaction.options) {
                nodeName = interaction.options?.getString('node');
            } else {
                nodeName = args[0];
            }

            if (!nodeName) {
                return interaction.reply({
                    embeds: [errorEmbed('Please provide a node name.')]
                });
            }

            await musicManager.switchNode(interaction.guild.id, nodeName);
            return interaction.reply({
                embeds: [successEmbed(`Switched to node **${nodeName}**.`)]
            });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed(`Failed to switch node: ${error.message}`)]
            });
        }
    }
};
