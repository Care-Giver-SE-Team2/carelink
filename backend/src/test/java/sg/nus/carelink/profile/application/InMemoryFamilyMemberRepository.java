package sg.nus.carelink.profile.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.profile.domain.model.FamilyMember;
import sg.nus.carelink.profile.domain.repository.FamilyMemberRepository;

/** Family records available to the use case without starting a database. */
class InMemoryFamilyMemberRepository implements FamilyMemberRepository {

	private final Map<Long, FamilyMember> rows = new HashMap<>();

	@Override
	public Optional<FamilyMember> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public Optional<FamilyMember> findByUserId(Long userId) {
		return rows.values().stream().filter(family -> userId.equals(family.userId())).findFirst();
	}

	@Override
	public FamilyMember save(FamilyMember family) {
		rows.put(family.id(), family);
		return family;
	}
}
