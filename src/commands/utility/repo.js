const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repo')
    .setDescription('Shows information about a GitHub repository')
    .addStringOption(opt => opt.setName('repo').setDescription('Repository (e.g., user/repo)').setRequired(true)),
  cooldown: 5,
  aliases: ['repository'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const repo = isSlash ? interaction.options?.getString('repo') : args?.join(' ');
    if (!repo || !repo.includes('/')) {
      return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a valid repository format: `user/repo`').setColor(config.embedColors.error)] });
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`);
      if (!res.ok) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Repository not found.').setColor(config.embedColors.error)] });
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setTitle(data.full_name)
        .setURL(data.html_url)
        .setColor(config.embedColors.info)
        .setThumbnail(data.owner?.avatar_url)
        .addFields(
          { name: 'Description', value: data.description || 'No description', inline: false },
          { name: 'Stars', value: `${data.stargazers_count}`, inline: true },
          { name: 'Forks', value: `${data.forks_count}`, inline: true },
          { name: 'Watchers', value: `${data.watchers_count}`, inline: true },
          { name: 'Language', value: data.language || 'N/A', inline: true },
          { name: 'Open Issues', value: `${data.open_issues_count}`, inline: true },
          { name: 'Size', value: `${(data.size / 1024).toFixed(1)} MB`, inline: true },
          { name: 'Default Branch', value: data.default_branch, inline: true },
          { name: 'License', value: data.license?.spdx_id || 'None', inline: true },
          { name: 'Created', value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`, inline: true },
          { name: 'Last Updated', value: `<t:${Math.floor(new Date(data.updated_at).getTime() / 1000)}:R>`, inline: true },
          { name: 'Topics', value: (data.topics || []).slice(0, 10).join(', ') || 'None', inline: false }
        )
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (e) {
      interaction.reply({ embeds: [new EmbedBuilder().setDescription('Error fetching repository data.').setColor(config.embedColors.error)] });
    }
  }
};
