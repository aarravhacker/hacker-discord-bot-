const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Shows information about a GitHub user or repository')
    .addStringOption(opt => opt.setName('query').setDescription('GitHub username or repo (e.g., user/repo)').setRequired(true)),
  cooldown: 5,
  aliases: ['gh', 'git'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const query = isSlash ? interaction.options?.getString('query') : args?.join(' ');
    if (!query) {
      return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a GitHub username or repository.').setColor(config.embedColors.error)] });
    }

    const isRepo = query.includes('/');
    const url = isRepo
      ? `https://api.github.com/repos/${query}`
      : `https://api.github.com/users/${query}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('User or repository not found.').setColor(config.embedColors.error)] });
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setTitle(isRepo ? data.full_name : data.login)
        .setURL(data.html_url)
        .setColor(config.embedColors.info)
        .setThumbnail(isRepo ? data.owner?.avatar_url : data.avatar_url);

      if (isRepo) {
        embed.addFields(
          { name: 'Description', value: data.description || 'No description', inline: false },
          { name: 'Stars', value: `${data.stargazers_count}`, inline: true },
          { name: 'Forks', value: `${data.forks_count}`, inline: true },
          { name: 'Language', value: data.language || 'N/A', inline: true },
          { name: 'Open Issues', value: `${data.open_issues_count}`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`, inline: true },
          { name: 'License', value: data.license?.spdx_id || 'None', inline: true }
        );
      } else {
        embed.addFields(
          { name: 'Name', value: data.name || data.login, inline: true },
          { name: 'Public Repos', value: `${data.public_repos}`, inline: true },
          { name: 'Followers', value: `${data.followers}`, inline: true },
          { name: 'Following', value: `${data.following}`, inline: true },
          { name: 'Joined', value: `<t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:R>`, inline: true },
          { name: 'Bio', value: data.bio || 'No bio', inline: false }
        );
      }

      embed.setTimestamp();
      interaction.reply({ embeds: [embed] });
    } catch (e) {
      interaction.reply({ embeds: [new EmbedBuilder().setDescription('Error fetching GitHub data.').setColor(config.embedColors.error)] });
    }
  }
};
