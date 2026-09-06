package sg.nus.carelink.profile.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.profile.domain.repository.ElderRepository;

/** Test double for the port: the service is exercised without Spring or a database (as in identity). */
class InMemoryElderRepository implements ElderRepository {

	private final Map<Long, Elder> rows = new HashMap<>();
	private long nextId = 1;

	@Override
	public Optional<Elder> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public Elder save(Elder elder) {
		Elder stored = elder.id() == null
				? new Elder(nextId, elder.userId(), elder.fullName(), elder.gender(), elder.dateOfBirth(), elder.phone(), elder.address(), elder.postalCode(), elder.sector(), elder.preferredDialects(), elder.livesAlone(), elder.mobilityLevel(), elder.continuityPreference(), elder.medicalNotes(), elder.createdAt(), elder.updatedAt())
				: elder;
		rows.put(stored.id(), stored);
		if (elder.id() == null) {
			nextId++;
		}
		return stored;
	}
}
