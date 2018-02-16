#!/usr/bin/env bash
set -e

cd "$(dirname "$(readlink -f "$BASH_SOURCE")")/.."

# some authors doesn't want to be in AUTHORS -> space as \\s
EXCLUDED_AUTHORS=("alreadylostmyself")

# see also ".mailmap" for how email addresses and names are deduplicated
{
	cat <<-'EOH'
	# This file lists all individuals having contributed content to the repository.
	# For how it is generated, see `tools/generate-authors.sh`.
	EOH
	git config --global grep.patternType perl

	excluded_regexp='^(?!'
	for i in "${!EXCLUDED_AUTHORS[@]}"
	do
		:
		if [ $i -gt 0 ]
		then
			excluded_regexp=$excluded_regexp'|'${EXCLUDED_AUTHORS[$i]}
		else
			excluded_regexp=$excluded_regexp${EXCLUDED_AUTHORS[$i]}
		fi
	done
	excluded_regexp=$excluded_regexp').*$'

	echo
	git log --format='%aN <%aE>' --author=$excluded_regexp | LC_ALL=C.UTF-8 sort -uf
} > AUTHORS
